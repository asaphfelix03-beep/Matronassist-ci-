"use client"

import { Bell, User, Wifi, WifiOff, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export function Navbar({ role }: { role: string }) {
  const [isOnline, setIsOnline] = useState(true)
  const [notifications, setNotifications] = useState([
    { id: "1", title: "Nouvelle patiente ajoutée", time: "Il y a 5min", unread: true },
    { id: "2", title: "Consultation terminée", time: "Il y a 1h", unread: true },
    { id: "3", title: "Rendez-vous rappel", time: "Il y a 2h", unread: false },
  ])
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
  }

  const handleLogout = () => {
    localStorage.removeItem("userRole")
    localStorage.removeItem("userEmail")

    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès",
    })

    setTimeout(() => {
      router.push("/login")
    }, 500)
  }

  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <header className="bg-card border-b sticky top-0 z-50 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">M</div>
        <h1 className="text-lg font-bold text-primary hidden sm:block">Matronassist-ci</h1>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
        >
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="sr-only sm:not-sr-only">{isOnline ? "En ligne" : "Hors ligne"}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.map((notif) => (
                <DropdownMenuItem
                  key={notif.id}
                  className="flex flex-col items-start p-3 cursor-pointer"
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex items-start justify-between w-full">
                    <span className={`text-sm ${notif.unread ? "font-bold" : ""}`}>{notif.title}</span>
                    {notif.unread && <div className="w-2 h-2 bg-primary rounded-full" />}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">{notif.time}</span>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem>Paramètres</DropdownMenuItem>
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
