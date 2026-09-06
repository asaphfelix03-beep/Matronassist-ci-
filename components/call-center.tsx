"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Phone, PhoneOff, Video } from "lucide-react"

import { CallPanel } from "@/components/call-panel"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { answerCall, fetchIncomingCall, startCall } from "@/lib/api-client"
import type { CallSession, UserRole } from "@/lib/types"
import { supportsCalls } from "@/lib/webrtc"

/** Cadence de détection des appels entrants. */
const INCOMING_POLL_MS = 3000

interface CallContextValue {
  /** Lance un appel vers le correspondant du dossier indiqué. */
  placeCall: (patientId: string, withVideo: boolean) => Promise<void>
  /** Faux si le navigateur ne gère pas WebRTC ou l'accès au micro. */
  isSupported: boolean
  /** Vrai si un appel est déjà en cours. */
  isBusy: boolean
}

const CallContext = createContext<CallContextValue | null>(null)

export function useCalls(): CallContextValue {
  const context = useContext(CallContext)
  if (!context) throw new Error("useCalls doit être utilisé dans un CallProvider")
  return context
}

/**
 * Gère le cycle de vie des appels pour toute l'application: détection des appels
 * entrants, sonnerie, et affichage du panneau d'appel.
 *
 * La détection se fait par sondage plutôt que par WebSocket: l'application est
 * déployée en fonctions serverless, où aucune connexion persistante ne peut être
 * maintenue de façon fiable.
 */
export function CallProvider({ role, children }: { role: UserRole; children: ReactNode }) {
  const [incoming, setIncoming] = useState<CallSession | null>(null)
  const [activeCall, setActiveCall] = useState<CallSession | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const { toast } = useToast()

  // L'état courant, lu dans l'intervalle de sondage sans le relancer.
  // La synchronisation passe par un effet: écrire une ref pendant le rendu
  // n'est pas sûr avec le rendu concurrent de React.
  const activeRef = useRef<CallSession | null>(null)
  const incomingRef = useRef<CallSession | null>(null)

  useEffect(() => {
    activeRef.current = activeCall
  }, [activeCall])

  useEffect(() => {
    incomingRef.current = incoming
  }, [incoming])

  // `supportsCalls()` interroge les API du navigateur: la valeur n'est connue
  // qu'après le montage, d'où l'initialisation dans un effet.
  useEffect(() => {
    setIsSupported(supportsCalls())
  }, [])

  const participatesInCalls = role === "patiente" || role === "matrone"

  useEffect(() => {
    if (!participatesInCalls) return

    let stopped = false

    const poll = async () => {
      // Inutile de sonder pendant un appel ou quand l'onglet est masqué.
      if (stopped || activeRef.current || document.hidden) return

      try {
        const call = await fetchIncomingCall()
        if (!stopped) setIncoming(call)
      } catch {
        // Une erreur réseau ponctuelle ne doit pas interrompre la détection.
      }
    }

    const timer = setInterval(poll, INCOMING_POLL_MS)
    poll()

    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [participatesInCalls])

  const placeCall = useCallback(
    async (patientId: string, withVideo: boolean) => {
      if (!supportsCalls()) {
        toast({ title: "Appels indisponibles", description: "Ce navigateur ne gère pas les appels." })
        return
      }
      if (activeRef.current || isStarting) return

      setIsStarting(true)
      try {
        setActiveCall(await startCall(patientId, withVideo))
      } catch (err) {
        toast({ title: "Appel impossible", description: err instanceof Error ? err.message : String(err) })
      } finally {
        setIsStarting(false)
      }
    },
    [isStarting, toast],
  )

  const accept = async () => {
    if (!incoming) return
    try {
      const call = await answerCall(incoming.id, "accept")
      setIncoming(null)
      setActiveCall(call)
    } catch (err) {
      toast({ title: "Impossible de décrocher", description: err instanceof Error ? err.message : String(err) })
      setIncoming(null)
    }
  }

  const decline = async () => {
    if (!incoming) return
    const call = incoming
    setIncoming(null)
    try {
      await answerCall(call.id, "decline")
    } catch {
      // L'appelant a peut-être déjà raccroché.
    }
  }

  const value = useMemo<CallContextValue>(
    () => ({ placeCall, isSupported, isBusy: activeCall !== null || isStarting }),
    [placeCall, isSupported, activeCall, isStarting],
  )

  return (
    <CallContext.Provider value={value}>
      {children}

      {incoming && !activeCall && (
        <div className="fixed inset-x-0 bottom-0 z-[90] p-4 sm:bottom-6 sm:right-6 sm:left-auto sm:p-0">
          <div className="mx-auto w-full max-w-sm rounded-2xl border-2 border-primary bg-card p-5 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                {incoming.withVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Appel {incoming.withVideo ? "vidéo" : "audio"} entrant
                </p>
                <p className="font-bold text-lg truncate">{incoming.callerName}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1 gap-2" onClick={accept}>
                <Phone className="w-4 h-4" />
                Décrocher
              </Button>
              <Button variant="destructive" className="flex-1 gap-2" onClick={decline}>
                <PhoneOff className="w-4 h-4" />
                Refuser
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeCall && <CallPanel call={activeCall} onClose={() => setActiveCall(null)} />}
    </CallContext.Provider>
  )
}
