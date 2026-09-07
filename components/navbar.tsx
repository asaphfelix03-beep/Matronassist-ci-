"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Bell, BellOff, KeyRound, LogOut, MessageSquare, Moon, Sun, User, Volume2, VolumeX } from "lucide-react"

import { useNotifications } from "@/components/notification-center"
import { OfflineIndicator } from "@/components/offline-indicator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { fetchAlerts, logout } from "@/lib/api-client"
import type { SessionUser, SystemAlert } from "@/lib/types"

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  matrone: "Matrone",
  patiente: "Patiente",
}

export function Navbar({ user }: { user: SessionUser }) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { resolvedTheme, setTheme } = useTheme()
  const { threads, unreadTotal, permission, requestPermission, isSoundEnabled, setSoundEnabled } = useNotifications()

  // Le thème résolu n'est connu qu'après hydratation: on n'affiche l'icône
  // correspondante qu'à ce moment, sinon le rendu serveur et client divergent.
  useEffect(() => setIsMounted(true), [])

  // Les alertes concernent le suivi d'un portefeuille de patientes: elles ne sont
  // pas affichées dans l'espace patiente.
  const showsAlerts = user.role === "admin" || user.role === "matrone"

  // Les fils de discussion n'existent qu'entre une patiente et sa matrone.
  const showsMessages = user.role === "matrone" || user.role === "patiente"

  useEffect(() => {
    if (!showsAlerts) return
    fetchAlerts()
      .then(setAlerts)
      .catch(() => setAlerts([]))
  }, [showsAlerts])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } catch {
      // La session est de toute façon abandonnée côté client.
    }
    toast({ title: "Déconnexion", description: "À bientôt." })
    router.replace("/login")
    router.refresh()
  }, [router, toast])

  return (
    <header className="bg-card border-b sticky top-0 z-50 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">M</div>
        <h1 className="text-lg font-bold text-primary hidden sm:block">Matronassist-ci</h1>
      </div>

      <div className="flex items-center gap-3">
        <OfflineIndicator />

        {showsMessages && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={unreadTotal > 0 ? `Messages, ${unreadTotal} non lus` : "Messages"}
              >
                <MessageSquare className="w-5 h-5" />
                {unreadTotal > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs"
                  >
                    {unreadTotal > 99 ? "99+" : unreadTotal}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Messages non lus</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {threads.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Aucun message non lu.</p>
                ) : (
                  threads.map((thread) => (
                    <DropdownMenuItem key={thread.patientId} className="flex flex-col items-start gap-1 p-3">
                      <div className="flex items-start justify-between w-full gap-2">
                        <span className="text-sm font-medium truncate">{thread.patientName}</span>
                        <Badge variant="destructive" className="shrink-0">
                          {thread.unread}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {thread.lastSenderName} : {thread.lastMessage}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSoundEnabled(!isSoundEnabled)}>
                {isSoundEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                {isSoundEnabled ? "Couper le son" : "Activer le son"}
              </DropdownMenuItem>
              {permission === "default" && (
                <DropdownMenuItem onClick={requestPermission}>
                  <Bell className="w-4 h-4 mr-2" />
                  Autoriser les notifications
                </DropdownMenuItem>
              )}
              {permission === "denied" && (
                <DropdownMenuItem disabled>
                  <BellOff className="w-4 h-4 mr-2" />
                  Notifications bloquées par le navigateur
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {showsAlerts && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Alertes">
                <Bell className="w-5 h-5" />
                {alerts.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {alerts.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Alertes de suivi</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Aucune alerte en cours.</p>
                ) : (
                  alerts.map((alert) => (
                    <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1 p-3">
                      <div className="flex items-start justify-between w-full gap-2">
                        <span className="text-sm font-medium">{alert.title}</span>
                        <span
                          className={`mt-1 w-2 h-2 shrink-0 rounded-full ${alert.severity === "error" ? "bg-destructive" : "bg-orange-400"}`}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{alert.detail}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Mon compte">
              <User className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span>{user.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
              <span className="text-xs font-normal text-muted-foreground">{ROLE_LABELS[user.role] ?? user.role}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {isMounted && resolvedTheme === "dark" ? (
                <Sun className="w-4 h-4 mr-2" />
              ) : (
                <Moon className="w-4 h-4 mr-2" />
              )}
              {isMounted && resolvedTheme === "dark" ? "Thème clair" : "Thème sombre"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/change-password")}>
              <KeyRound className="w-4 h-4 mr-2" />
              Changer le mot de passe
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
