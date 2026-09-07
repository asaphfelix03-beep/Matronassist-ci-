"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Phone, PhoneOff, Video } from "lucide-react"

import { CallPanel } from "@/components/call-panel"
import { useNotifications } from "@/components/notification-center"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { answerCall, startCall } from "@/lib/api-client"
import { ring } from "@/lib/sound"
import type { CallSession } from "@/lib/types"
import { supportsCalls } from "@/lib/webrtc"

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
 * Gère le cycle de vie des appels pour toute l'application: sonnerie d'appel
 * entrant, décrochage et affichage du panneau d'appel.
 *
 * La détection des appels entrants n'est plus faite ici: elle vient du centre de
 * notifications, qui interroge une route unique pour les messages et les appels.
 */
export function CallProvider({ children }: { children: ReactNode }) {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [declinedIds, setDeclinedIds] = useState<string[]>([])
  const { toast } = useToast()
  const { incomingCall, refresh, isSoundEnabled } = useNotifications()

  // Un appel refusé ne doit pas resonner tant que le serveur ne l'a pas clos.
  const incoming = incomingCall && !declinedIds.includes(incomingCall.id) ? incomingCall : null

  // L'appel en cours, lu dans des gestionnaires asynchrones sans les relancer.
  // La synchronisation passe par un effet: écrire une ref pendant le rendu
  // n'est pas sûr avec le rendu concurrent de React.
  const activeRef = useRef<CallSession | null>(null)

  useEffect(() => {
    activeRef.current = activeCall
  }, [activeCall])

  // `supportsCalls()` interroge les API du navigateur: la valeur n'est connue
  // qu'après le montage, d'où l'initialisation dans un effet.
  useEffect(() => {
    setIsSupported(supportsCalls())
  }, [])

  // Sonnerie au moment où un appel apparaît, une seule fois par appel.
  const ringingIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!incoming || activeCall) {
      if (!incoming) ringingIdRef.current = null
      return
    }
    if (ringingIdRef.current === incoming.id) return

    ringingIdRef.current = incoming.id
    if (isSoundEnabled) ring()
  }, [incoming, activeCall, isSoundEnabled])

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

  /** Retire l'appel de l'affichage sans attendre le prochain tour de sondage. */
  const dismiss = useCallback(
    (callId: string) => {
      setDeclinedIds((prev) => (prev.includes(callId) ? prev : [...prev, callId]))
      refresh()
    },
    [refresh],
  )

  const accept = async () => {
    if (!incoming) return
    const callId = incoming.id
    try {
      const call = await answerCall(callId, "accept")
      dismiss(callId)
      setActiveCall(call)
    } catch (err) {
      toast({ title: "Impossible de décrocher", description: err instanceof Error ? err.message : String(err) })
      dismiss(callId)
    }
  }

  const decline = async () => {
    if (!incoming) return
    const callId = incoming.id
    dismiss(callId)
    try {
      await answerCall(callId, "decline")
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
