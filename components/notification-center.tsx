"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { useToast } from "@/hooks/use-toast"
import { fetchNotifications } from "@/lib/api-client"
import { chime } from "@/lib/sound"
import type { CallSession, NotificationSnapshot, UnreadThread, UserRole } from "@/lib/types"

/**
 * Cadence de sondage. L'onglet masqué continue d'être surveillé — c'est
 * précisément là qu'une notification est utile — mais plus lentement, pour ne
 * pas vider la batterie ni le forfait de données.
 */
const POLL_VISIBLE_MS = 3000
const POLL_HIDDEN_MS = 15000

const EMPTY: NotificationSnapshot = { threads: [], unreadTotal: 0, incomingCall: null }

interface NotificationContextValue {
  threads: UnreadThread[]
  unreadTotal: number
  /** Appel entrant détecté par le sondage, consommé par le module d'appel. */
  incomingCall: CallSession | null
  /** Force une relecture immédiate, sans attendre le prochain tour. */
  refresh: () => void
  /** Retire un fil du compteur dès son ouverture, avant confirmation serveur. */
  clearThread: (patientId: string) => void
  /**
   * Déclare le fil affiché à l'écran. Ses messages ne déclenchent pas de
   * notification: l'utilisateur les a sous les yeux.
   */
  setActiveThread: (patientId: string | null) => void
  /** État de l'autorisation d'affichage des notifications système. */
  permission: NotificationPermission | "unsupported"
  requestPermission: () => void
  isSoundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) throw new Error("useNotifications doit être utilisé dans un NotificationProvider")
  return context
}

const SOUND_KEY = "matronassist.notifications.sound"

/**
 * Notification système, silencieuse si l'autorisation n'a pas été accordée.
 *
 * Le service worker est privilégié: Chrome sur Android refuse le constructeur
 * `Notification` et n'accepte que `showNotification`. Le constructeur reste le
 * repli pour les navigateurs de bureau sans service worker enregistré.
 */
async function notifySystem(title: string, body: string, tag: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return

  // `tag` remplace la notification précédente du même fil au lieu de les empiler.
  const options: NotificationOptions = { body, tag, icon: "/icon.svg", badge: "/icon.svg" }

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.showNotification(title, options)
        return
      }
    }
    new Notification(title, options)
  } catch {
    // L'absence de notification système ne doit pas casser le reste: le bandeau
    // interne et le compteur de la cloche restent affichés.
  }
}

/**
 * Surveille en continu les messages non lus et les appels entrants, et prévient
 * l'utilisateur où qu'il soit dans l'application: bandeau interne, son, et
 * notification système quand l'onglet est en arrière-plan.
 *
 * Le sondage remplace une connexion persistante: l'application tourne en
 * fonctions serverless, où ni WebSocket ni flux longue durée ne tiennent de
 * façon fiable. Une seule route est interrogée pour les messages et les appels.
 */
export function NotificationProvider({ role, children }: { role: UserRole; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<NotificationSnapshot>(EMPTY)
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default")
  const [isSoundEnabled, setIsSoundEnabledState] = useState(true)
  const { toast } = useToast()

  // Derniers messages déjà signalés, pour ne pas notifier deux fois le même.
  const announcedRef = useRef<Set<string>>(new Set())
  const isFirstLoadRef = useRef(true)
  const soundRef = useRef(true)
  const activeThreadRef = useRef<string | null>(null)

  // Seuls les fils de discussion déclenchent des notifications; l'administration
  // n'en fait pas partie.
  const participates = role === "matrone" || role === "patiente"

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission)
    try {
      const stored = localStorage.getItem(SOUND_KEY)
      if (stored !== null) {
        const enabled = stored === "1"
        setIsSoundEnabledState(enabled)
        soundRef.current = enabled
      }
    } catch {
      // Navigation privée ou stockage bloqué: le réglage par défaut s'applique.
    }
  }, [])

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setIsSoundEnabledState(enabled)
    soundRef.current = enabled
    try {
      localStorage.setItem(SOUND_KEY, enabled ? "1" : "0")
    } catch {
      // Le réglage ne survivra pas à la session, sans conséquence ici.
    }
  }, [])

  const requestPermission = useCallback(() => {
    if (typeof Notification === "undefined") return
    Notification.requestPermission().then(setPermission).catch(() => undefined)
  }, [])

  /** Signale les fils dont le dernier message n'a pas encore été annoncé. */
  const announce = useCallback(
    (threads: UnreadThread[]) => {
      const announced = announcedRef.current
      // Le fil ouvert et visible est exclu: son propre rafraîchissement affiche
      // déjà le message, une notification par-dessus n'apporterait rien.
      const isReading = (patientId: string) => !document.hidden && activeThreadRef.current === patientId
      const fresh = threads.filter((thread) => !announced.has(thread.lastMessageId) && !isReading(thread.patientId))

      for (const thread of threads) announced.add(thread.lastMessageId)

      // Le premier tour établit la référence: à la connexion, les messages déjà
      // en attente ne doivent pas déclencher une rafale de notifications.
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false
        return
      }
      if (fresh.length === 0) return

      if (soundRef.current) chime()

      for (const thread of fresh) {
        const title = `Message de ${thread.lastSenderName}`
        // Le nom de la patiente situe le fil quand une matrone en suit plusieurs.
        const body = thread.patientName === thread.lastSenderName ? thread.lastMessage : `${thread.patientName} — ${thread.lastMessage}`
        toast({ title, description: body })
        if (document.hidden) void notifySystem(title, body, `thread-${thread.patientId}`)
      }
    },
    [toast],
  )

  const load = useCallback(async () => {
    try {
      const next = await fetchNotifications()
      setSnapshot(next)
      announce(next.threads)
    } catch {
      // Une itération ratée n'interrompt pas la surveillance: hors ligne, la
      // suivante reprendra dès le retour du réseau.
    }
  }, [announce])

  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    if (!participates) return

    let stopped = false
    let timer: ReturnType<typeof setTimeout>

    // Réarmé à chaque tour plutôt qu'un intervalle fixe: la cadence peut ainsi
    // suivre la visibilité de l'onglet, et deux requêtes ne se chevauchent pas.
    const loop = async () => {
      if (stopped) return
      await loadRef.current()
      if (stopped) return
      timer = setTimeout(loop, document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS)
    }

    // Revenir sur l'onglet doit rafraîchir tout de suite, sans attendre le tour.
    const onVisible = () => {
      if (!document.hidden && !stopped) {
        clearTimeout(timer)
        loop()
      }
    }

    loop()
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [participates])

  const refresh = useCallback(() => {
    loadRef.current()
  }, [])

  const setActiveThread = useCallback((patientId: string | null) => {
    activeThreadRef.current = patientId
  }, [])

  const clearThread = useCallback((patientId: string) => {
    setSnapshot((prev) => {
      const thread = prev.threads.find((t) => t.patientId === patientId)
      if (!thread) return prev
      return {
        ...prev,
        threads: prev.threads.filter((t) => t.patientId !== patientId),
        unreadTotal: Math.max(0, prev.unreadTotal - thread.unread),
      }
    })
  }, [])

  const value = useMemo<NotificationContextValue>(
    () => ({
      threads: snapshot.threads,
      unreadTotal: snapshot.unreadTotal,
      incomingCall: snapshot.incomingCall,
      refresh,
      clearThread,
      setActiveThread,
      permission,
      requestPermission,
      isSoundEnabled,
      setSoundEnabled,
    }),
    [snapshot, refresh, clearThread, setActiveThread, permission, requestPermission, isSoundEnabled, setSoundEnabled],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
