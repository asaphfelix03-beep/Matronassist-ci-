"use client"

import { useCallback, useEffect, useState } from "react"
import { CloudUpload, Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { flushQueue, listPending, onQueueChange, type PendingWrite } from "@/lib/offline-queue"

/**
 * État de connexion et envois en attente.
 *
 * Remplace l'ancien badge « En ligne / Hors ligne » qui était purement décoratif:
 * il indique maintenant ce qui reste réellement à transmettre, et permet de
 * relancer l'envoi à la main.
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [pending, setPending] = useState<PendingWrite[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  const refresh = useCallback(() => {
    listPending().then(setPending)
  }, [])

  const sync = useCallback(
    async (announce: boolean) => {
      setIsSyncing(true)
      try {
        const { sent, failed } = await flushQueue()
        if (sent > 0 || failed > 0) {
          toast({
            title: failed > 0 ? "Synchronisation partielle" : "Synchronisation terminée",
            description:
              failed > 0
                ? `${sent} envoi(s) transmis, ${failed} refusé(s) par le serveur.`
                : `${sent} envoi(s) transmis.`,
          })
        } else if (announce) {
          toast({ title: "Rien à synchroniser", description: "Tous vos enregistrements sont à jour." })
        }
      } finally {
        setIsSyncing(false)
        refresh()
      }
    },
    [refresh, toast],
  )

  useEffect(() => {
    setIsOnline(navigator.onLine)
    refresh()

    const handleOnline = () => {
      setIsOnline(true)
      sync(false)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    const unsubscribe = onQueueChange(refresh)

    // Une saisie peut dater d'une session précédente fermée hors ligne.
    if (navigator.onLine) sync(false)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      unsubscribe()
    }
  }, [refresh, sync])

  const hasPending = pending.length > 0

  // En ligne et rien en attente: un simple témoin discret suffit.
  if (isOnline && !hasPending) {
    return (
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
        title="Connecté, tout est synchronisé"
      >
        <Wifi className="w-3 h-3" />
        <span className="sr-only sm:not-sr-only">En ligne</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 gap-1 px-2 rounded-full text-xs font-medium ${
            isOnline
              ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
              : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {isOnline ? <CloudUpload className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="sr-only sm:not-sr-only">{isOnline ? "À envoyer" : "Hors ligne"}</span>
          {hasPending && (
            <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
              {pending.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{isOnline ? "Envois en attente" : "Mode hors ligne"}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="px-2 py-1.5 text-sm text-muted-foreground">
          {isOnline
            ? "Ces saisies n'ont pas encore été transmises."
            : "Vos saisies sont conservées sur l'appareil et partiront au retour du réseau."}
        </div>

        {hasPending && (
          <div className="max-h-48 overflow-y-auto px-2 pb-2 space-y-1">
            {pending.map((write) => (
              <div key={write.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{write.label}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(write.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}

        {isOnline && hasPending && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button size="sm" className="w-full gap-2" disabled={isSyncing} onClick={() => sync(true)}>
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Envoyer maintenant
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
