"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Heart, ShieldCheck, Baby } from "lucide-react"
import type { UserRole } from "@/lib/types"

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  const handleLogin = () => {
    if (selectedRole && email && password) {
      // Store role in localStorage for demo
      localStorage.setItem("userRole", selectedRole)
      localStorage.setItem("userEmail", email)
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-2">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-3xl font-bold text-balance">Matronassist-ci</h1>
          <p className="text-muted-foreground">Suivi Maternel Connecté</p>
        </div>

        {!selectedRole ? (
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Choisissez votre profil</CardTitle>
              <CardDescription>Sélectionnez votre rôle pour vous connecter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-24 flex-col gap-3 text-lg border-2 hover:border-primary hover:bg-primary/5 bg-transparent group"
                onClick={() => setSelectedRole("admin")}
              >
                <ShieldCheck className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                <span className="font-bold">Administrateur</span>
              </Button>
              <Button
                variant="outline"
                className="w-full h-24 flex-col gap-3 text-lg border-2 hover:border-secondary hover:bg-secondary/5 bg-transparent group"
                onClick={() => setSelectedRole("matrone")}
              >
                <Heart className="w-8 h-8 text-secondary-foreground group-hover:scale-110 transition-transform" />
                <span className="font-bold">Matrone</span>
              </Button>
              <Button
                variant="outline"
                className="w-full h-24 flex-col gap-3 text-lg border-2 hover:border-accent hover:bg-accent/5 bg-transparent group"
                onClick={() => setSelectedRole("patiente")}
              >
                <Baby className="w-8 h-8 text-accent-foreground group-hover:scale-110 transition-transform" />
                <span className="font-bold">Patiente</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedRole(null)} className="h-8 px-2">
                  ← Retour
                </Button>
              </div>
              <CardTitle className="capitalize text-2xl">Espace {selectedRole}</CardTitle>
              <CardDescription>Entrez vos identifiants pour accéder au tableau de bord</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Identifiant / Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <Button className="w-full h-14 text-xl font-bold rounded-xl mt-2" onClick={handleLogin}>
                Se connecter
              </Button>
              <div className="text-center">
                <Button variant="link" className="text-sm text-muted-foreground">
                  Difficulté de connexion ?
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground max-w-xs mx-auto">
          Matronassist-ci assure la confidentialité de vos données de santé périnatale.
        </p>
      </div>
    </div>
  )
}
