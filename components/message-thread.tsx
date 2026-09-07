"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Check, CheckCheck, Clock, Phone, RotateCw, Send, Video } from "lucide-react"

import { useCalls } from "@/components/call-center"
import { useNotifications } from "@/components/notification-center"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { describeWriteError, fetchMessages, sendMessage } from "@/lib/api-client"
import type { Message } from "@/lib/types"

/** Cadence de rafraîchissement du fil quand l'onglet est visible. */
const POLL_MS = 3000

/** En deçà de cette distance du bas, on considère que l'utilisateur suit le fil. */
const STICK_TO_BOTTOM_PX = 120

/**
 * Message en cours d'envoi, affiché avant confirmation du serveur.
 *
 * Sur les réseaux mobiles visés, attendre la réponse avant d'afficher quoi que
 * ce soit donne l'impression que l'application ne répond pas.
 */
interface PendingMessage {
  /** Identifiant local, le temps que le serveur attribue le sien. */
  localId: string
  body: string
  status: "sending" | "failed"
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

/** Libellé du séparateur de journée: « Aujourd'hui », « Hier », puis la date. */
function formatDayLabel(iso: string): string {
  const date = new Date(iso)
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((startOfToday.getTime() - day.getTime()) / 86400000)

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return "Hier"
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })
}

function sameDay(a: string, b: string): boolean {
  const x = new Date(a)
  const y = new Date(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}

/**
 * Fil de discussion d'une patiente, partagé par l'espace matrone et l'espace
 * patiente.
 *
 * Le fil se met à jour en continu: après le chargement initial, seules les
 * nouveautés sont demandées (paramètre `since`), et le sondage s'arrête quand
 * l'onglet passe en arrière-plan.
 */
export function MessageThread({
  patientId,
  emptyLabel,
  onRead,
  canCall = false,
}: {
  patientId: string
  emptyLabel: string
  onRead?: (patientId: string) => void
  /** Affiche les boutons d'appel si un correspondant peut décrocher. */
  canCall?: boolean
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState<PendingMessage[]>([])
  const [readUpTo, setReadUpTo] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMessageAtRef = useRef<string | null>(null)
  /** Faux dès que l'utilisateur remonte lire l'historique. */
  const stickToBottomRef = useRef(true)

  const { toast } = useToast()
  const { placeCall, isSupported, isBusy } = useCalls()
  const { clearThread, refresh, setActiveThread } = useNotifications()

  /** Fusionne sans doublon: un message envoyé peut revenir par le sondage. */
  const merge = useCallback((incoming: Message[]) => {
    if (incoming.length === 0) return

    setMessages((prev) => {
      const known = new Set(prev.map((message) => message.id))
      const added = incoming.filter((message) => !known.has(message.id))
      return added.length === 0 ? prev : [...prev, ...added]
    })

    const latest = incoming[incoming.length - 1]
    if (latest && (!lastMessageAtRef.current || latest.createdAt > lastMessageAtRef.current)) {
      lastMessageAtRef.current = latest.createdAt
    }
  }, [])

  // Chargement initial: on repart de zéro à chaque changement de patiente.
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setMessages([])
    setPending([])
    setReadUpTo(null)
    lastMessageAtRef.current = null
    stickToBottomRef.current = true

    fetchMessages(patientId)
      .then((feed) => {
        if (cancelled) return
        setMessages(feed.messages)
        setReadUpTo(feed.readUpTo)
        lastMessageAtRef.current = feed.messages[feed.messages.length - 1]?.createdAt ?? null
        onRead?.(patientId)
        // La lecture du fil a marqué les messages comme lus côté serveur: le
        // compteur de la cloche doit le refléter tout de suite.
        clearThread(patientId)
      })
      .catch((err) => {
        if (!cancelled) {
          toast({ title: "Messagerie indisponible", description: err instanceof Error ? err.message : String(err) })
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [patientId, onRead, toast, clearThread])

  // Rafraîchissement continu des seules nouveautés.
  useEffect(() => {
    let stopped = false

    const tick = async () => {
      if (stopped || document.hidden) return
      try {
        const feed = await fetchMessages(patientId, lastMessageAtRef.current)
        if (stopped) return
        // `readUpTo` évolue même sans nouveau message: c'est l'accusé de lecture.
        setReadUpTo(feed.readUpTo)
        if (feed.messages.length === 0) return
        merge(feed.messages)
        onRead?.(patientId)
        clearThread(patientId)
      } catch {
        // Une itération ratée n'interrompt pas le fil: la suivante réessaiera.
      }
    }

    const timer = setInterval(tick, POLL_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [patientId, merge, onRead, clearThread])

  // Tant que ce fil est monté, ses messages n'ont pas à être notifiés.
  useEffect(() => {
    setActiveThread(patientId)
    return () => setActiveThread(null)
  }, [patientId, setActiveThread])

  // Le défilement automatique ne s'impose que si l'utilisateur suivait déjà le
  // bas du fil: le ramener de force pendant qu'il relit l'historique est hostile.
  useEffect(() => {
    if (stickToBottomRef.current) bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages, pending])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_PX
  }

  /** Envoie, en affichant le message sans attendre la confirmation du serveur. */
  const submit = useCallback(
    async (body: string, localId: string) => {
      setPending((prev) =>
        prev.some((p) => p.localId === localId)
          ? prev.map((p) => (p.localId === localId ? { ...p, status: "sending" } : p))
          : [...prev, { localId, body, status: "sending" }],
      )
      stickToBottomRef.current = true

      try {
        const sent = await sendMessage(patientId, body)
        setPending((prev) => prev.filter((p) => p.localId !== localId))
        merge([sent])
        refresh()
      } catch (err) {
        const described = describeWriteError(err, "Envoi impossible")
        // Une écriture mise en file d'attente hors ligne partira d'elle-même:
        // la laisser affichée créerait un doublon au retour du réseau.
        const queued = described.title !== "Envoi impossible"
        setPending((prev) =>
          queued
            ? prev.filter((p) => p.localId !== localId)
            : prev.map((p) => (p.localId === localId ? { ...p, status: "failed" } : p)),
        )
        toast(described)
      }
    },
    [patientId, merge, refresh, toast],
  )

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return

    setDraft("")
    void submit(body, `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  }

  /** Messages et séparateurs de journée, dans l'ordre d'affichage. */
  const rows = useMemo(() => {
    const items: Array<
      { kind: "day"; key: string; label: string } | { kind: "message"; key: string; message: Message }
    > = []

    messages.forEach((message, index) => {
      const previous = messages[index - 1]
      if (!previous || !sameDay(previous.createdAt, message.createdAt)) {
        items.push({ kind: "day", key: `day-${message.id}`, label: formatDayLabel(message.createdAt) })
      }
      items.push({ kind: "message", key: message.id, message })
    })

    return items
  }, [messages])

  return (
    <div className="flex flex-col gap-3">
      {canCall && isSupported && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isBusy}
            onClick={() => placeCall(patientId, false)}
          >
            <Phone className="w-4 h-4" />
            Appel audio
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isBusy}
            onClick={() => placeCall(patientId, true)}
          >
            <Video className="w-4 h-4" />
            Appel vidéo
          </Button>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-[420px] min-h-[160px] overflow-y-auto rounded-lg border bg-muted/20 p-3 space-y-3"
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : messages.length === 0 && pending.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{emptyLabel}</p>
        ) : (
          rows.map((row) =>
            row.kind === "day" ? (
              <div key={row.key} className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {row.label}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            ) : (
              <div key={row.key} className={`flex ${row.message.mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    row.message.mine ? "bg-primary text-primary-foreground" : "bg-card border"
                  }`}
                >
                  {!row.message.mine && <div className="text-xs font-bold mb-0.5">{row.message.senderName}</div>}
                  <p className="text-sm whitespace-pre-wrap break-words">{row.message.body}</p>
                  <div
                    className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                      row.message.mine ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    <span>{formatTime(row.message.createdAt)}</span>
                    {row.message.mine &&
                      (readUpTo !== null && row.message.createdAt <= readUpTo ? (
                        <CheckCheck className="w-3.5 h-3.5" aria-label="Lu" />
                      ) : (
                        <Check className="w-3.5 h-3.5" aria-label="Envoyé" />
                      ))}
                  </div>
                </div>
              </div>
            ),
          )
        )}

        {pending.map((item) => (
          <div key={item.localId} className="flex justify-end">
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                item.status === "failed"
                  ? "border border-destructive bg-destructive/10"
                  : "bg-primary/60 text-primary-foreground"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{item.body}</p>
              <div className="flex items-center justify-end gap-1 text-[10px] mt-1">
                {item.status === "sending" ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Envoi…</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-destructive">Non envoyé</span>
                    <button
                      type="button"
                      onClick={() => void submit(item.body, item.localId)}
                      className="ml-1 inline-flex items-center gap-1 font-bold text-destructive underline"
                    >
                      <RotateCw className="w-3 h-3" />
                      Réessayer
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Écrire un message…"
          rows={2}
          maxLength={2000}
          className="resize-none"
          onKeyDown={(e) => {
            // Entrée envoie, Maj+Entrée passe à la ligne.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={!draft.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
