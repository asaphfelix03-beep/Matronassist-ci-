"use client"

import type React from "react"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Phone, Send, Video } from "lucide-react"

import { useCalls } from "@/components/call-center"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { describeWriteError, fetchMessages, sendMessage } from "@/lib/api-client"
import type { Message } from "@/lib/types"

/** Cadence de rafraîchissement du fil quand l'onglet est visible. */
const POLL_MS = 3000

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
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
  const [draft, setDraft] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMessageAtRef = useRef<string | null>(null)
  const { toast } = useToast()
  const { placeCall, isSupported, isBusy } = useCalls()

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
    lastMessageAtRef.current = null

    fetchMessages(patientId)
      .then((initial) => {
        if (cancelled) return
        setMessages(initial)
        lastMessageAtRef.current = initial[initial.length - 1]?.createdAt ?? null
        onRead?.(patientId)
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
  }, [patientId, onRead, toast])

  // Rafraîchissement continu des seules nouveautés.
  useEffect(() => {
    let stopped = false

    const tick = async () => {
      if (stopped || document.hidden) return
      try {
        const fresh = await fetchMessages(patientId, lastMessageAtRef.current)
        if (stopped || fresh.length === 0) return
        merge(fresh)
        onRead?.(patientId)
      } catch {
        // Une itération ratée n'interrompt pas le fil: la suivante réessaiera.
      }
    }

    const timer = setInterval(tick, POLL_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [patientId, merge, onRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return

    setIsSending(true)
    try {
      merge([await sendMessage(patientId, body)])
      setDraft("")
    } catch (err) {
      toast(describeWriteError(err, "Envoi impossible"))
    } finally {
      setIsSending(false)
    }
  }

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

      <div className="max-h-[420px] min-h-[160px] overflow-y-auto rounded-lg border bg-muted/20 p-3 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{emptyLabel}</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.mine ? "bg-primary text-primary-foreground" : "bg-card border"
                }`}
              >
                {!message.mine && <div className="text-xs font-bold mb-0.5">{message.senderName}</div>}
                <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                <div
                  className={`text-[10px] mt-1 ${message.mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                >
                  {formatTime(message.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
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
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={isSending || !draft.trim()}>
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  )
}
