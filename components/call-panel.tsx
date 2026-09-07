"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { answerCall, fetchCall, fetchSignals, sendSignal } from "@/lib/api-client"
import type { CallSession } from "@/lib/types"
import { buildIceServers, describeMediaError } from "@/lib/webrtc"

/** Cadence de sondage des signaux pendant la négociation. */
const SIGNAL_POLL_MS = 1000

type Phase = "connecting" | "ringing" | "connected" | "ended"

const PHASE_LABELS: Record<Phase, string> = {
  connecting: "Connexion…",
  ringing: "Sonnerie…",
  connected: "En communication",
  ended: "Appel terminé",
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

/**
 * Appel audio/vidéo pair-à-pair.
 *
 * Le média ne transite jamais par le serveur: seule la négociation (SDP et
 * candidats ICE) passe par l'API, qui sert de canal de signalisation. Les deux
 * pairs sondent `/api/calls/:id/signals` en s'échangeant uniquement les nouveaux
 * signaux depuis le dernier reçu.
 */
export function CallPanel({ call, onClose }: { call: CallSession; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>(call.status === "active" ? "connecting" : "ringing")
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(!call.withVideo)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const lastSignalAtRef = useRef<string | null>(null)
  /** Les candidats reçus avant la description distante doivent être différés. */
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const closedRef = useRef(false)

  const { toast } = useToast()

  const teardown = useCallback(() => {
    closedRef.current = true
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    peerRef.current?.close()
    peerRef.current = null
  }, [])

  const hangUp = useCallback(async () => {
    teardown()
    setPhase("ended")
    try {
      await answerCall(call.id, "end")
    } catch {
      // L'appel est peut-être déjà terminé côté serveur.
    }
    onClose()
  }, [call.id, onClose, teardown])

  // Établissement de la connexion pair-à-pair.
  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      // Remise à zéro explicite: le montage précédent a pu poser ces drapeaux
      // (React remonte les effets en mode strict), et un état résiduel
      // empêcherait cet appel-ci de se déclarer connecté.
      closedRef.current = false
      pendingCandidatesRef.current = []
      lastSignalAtRef.current = null

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: call.withVideo })
      } catch (err) {
        setError(describeMediaError(err))
        setPhase("ended")
        return
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const peer = new RTCPeerConnection({ iceServers: buildIceServers() })
      peerRef.current = peer

      stream.getTracks().forEach((track) => peer.addTrack(track, stream))

      peer.ontrack = (event) => {
        const [remote] = event.streams
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remote
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote
      }

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(call.id, "candidate", JSON.stringify(event.candidate)).catch(() => {})
        }
      }

      const onStateChange = () => {
        if (closedRef.current) return

        // `connectionState` n'est pas signalé de façon fiable par tous les
        // navigateurs; `iceConnectionState` sert de second témoin.
        const isUp =
          peer.connectionState === "connected" ||
          peer.iceConnectionState === "connected" ||
          peer.iceConnectionState === "completed"

        if (isUp) {
          setPhase("connected")
          return
        }

        if (peer.connectionState === "failed" || peer.iceConnectionState === "failed") {
          setError("La connexion n'a pas pu être établie. Un réseau restrictif peut bloquer l'appel.")
          setPhase("ended")
        }
      }

      peer.onconnectionstatechange = onStateChange
      peer.oniceconnectionstatechange = onStateChange

      // L'appelant émet l'offre; le destinataire répond quand elle arrive.
      if (call.isCaller) {
        const offer = await peer.createOffer()
        await peer.setLocalDescription(offer)
        await sendSignal(call.id, "offer", JSON.stringify(offer))
      }
    }

    setup().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Échec de l'appel")
        setPhase("ended")
      }
    })

    return () => {
      cancelled = true
      teardown()
    }
  }, [call.id, call.isCaller, call.withVideo, teardown])

  // Ces valeurs sont lues dans la boucle sans la relancer: `onClose` change
  // d'identité à chaque rendu du fournisseur, et `phase` à chaque étape de
  // l'appel. Les mettre en dépendances reconstruisait la boucle en continu.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Réception des signaux de l'autre pair et surveillance de l'état de l'appel.
  useEffect(() => {
    let stopped = false

    const applyCandidates = async (peer: RTCPeerConnection) => {
      for (const candidate of pendingCandidatesRef.current) {
        await peer.addIceCandidate(candidate).catch(() => {})
      }
      pendingCandidatesRef.current = []
    }

    const tick = async () => {
      const peer = peerRef.current
      if (!peer || stopped || phaseRef.current === "ended") return

      try {
        const [state, signals] = await Promise.all([
          fetchCall(call.id),
          fetchSignals(call.id, lastSignalAtRef.current),
        ])

        if (stopped) return

        if (state.status === "ended" || state.status === "declined" || state.status === "missed") {
          teardown()
          setPhase("ended")
          toast({
            title: state.status === "declined" ? "Appel refusé" : "Appel terminé",
            description: `Avec ${call.isCaller ? state.patientName : state.callerName}.`,
          })
          onCloseRef.current()
          return
        }

        for (const signal of signals) {
          lastSignalAtRef.current = signal.createdAt
          const payload = JSON.parse(signal.payload)

          if (signal.kind === "offer") {
            await peer.setRemoteDescription(new RTCSessionDescription(payload))
            await applyCandidates(peer)
            const answer = await peer.createAnswer()
            await peer.setLocalDescription(answer)
            await sendSignal(call.id, "answer", JSON.stringify(answer))
          } else if (signal.kind === "answer") {
            await peer.setRemoteDescription(new RTCSessionDescription(payload))
            await applyCandidates(peer)
          } else if (peer.remoteDescription) {
            await peer.addIceCandidate(payload).catch(() => {})
          } else {
            pendingCandidatesRef.current.push(payload)
          }
        }
      } catch {
        // Une itération ratée n'interrompt pas l'appel: la suivante réessaiera.
      }
    }

    const timer = setInterval(tick, SIGNAL_POLL_MS)
    tick()

    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [call.id, call.isCaller, teardown, toast])

  // Compteur de durée, démarré à la connexion effective.
  useEffect(() => {
    if (phase !== "connected") return
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [phase])

  const toggleMute = () => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? []
    const next = !isMuted
    tracks.forEach((track) => (track.enabled = !next))
    setIsMuted(next)
  }

  const toggleCamera = () => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? []
    if (tracks.length === 0) return
    const next = !isCameraOff
    tracks.forEach((track) => (track.enabled = !next))
    setIsCameraOff(next)
  }

  const correspondent = call.isCaller ? call.patientName : call.callerName

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">{PHASE_LABELS[phase]}</p>
          <h2 className="text-3xl font-bold">{correspondent}</h2>
          {phase === "connected" && (
            <p className="text-lg font-mono text-muted-foreground">{formatDuration(elapsed)}</p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        {call.withVideo ? (
          <div className="relative rounded-2xl overflow-hidden bg-muted aspect-video">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-3 right-3 w-28 rounded-lg border-2 border-background object-cover"
            />
          </div>
        ) : (
          <div className="mx-auto w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
            {correspondent.charAt(0).toUpperCase()}
          </div>
        )}

        {/* L'audio distant est lu ici; l'élément reste invisible. */}
        <audio ref={remoteAudioRef} autoPlay className="hidden" />

        <div className="flex items-center justify-center gap-4">
          <Button
            type="button"
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={toggleMute}
            aria-label={isMuted ? "Réactiver le micro" : "Couper le micro"}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          {call.withVideo && (
            <Button
              type="button"
              variant={isCameraOff ? "destructive" : "secondary"}
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={toggleCamera}
              aria-label={isCameraOff ? "Activer la caméra" : "Couper la caméra"}
            >
              {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </Button>
          )}

          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-16 w-16 rounded-full"
            onClick={hangUp}
            aria-label="Raccrocher"
          >
            <PhoneOff className="w-7 h-7" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          La conversation circule directement entre les deux appareils : elle ne passe pas par nos serveurs et n'est
          pas enregistrée.
        </p>
      </div>
    </div>
  )
}
