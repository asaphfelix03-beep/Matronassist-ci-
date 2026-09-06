"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Heart, Loader2 } from "lucide-react"
import { login } from "@/lib/api-client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const user = await login(email, password)
      // Un mot de passe provisoire doit être remplacé avant tout accès aux données.
      router.replace(user.mustChangePassword ? "/change-password" : "/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible")
      setIsSubmitting(false)
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

        <Card className="border-2">
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              Accédez à votre espace. Votre rôle est déterminé par votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
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
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full h-14 text-xl font-bold rounded-xl mt-2" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Se connecter"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Vous n'avez pas encore d'accès ? Les comptes sont créés par votre administrateur ou votre matrone
                référente.
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground max-w-xs mx-auto">
          Matronassist-ci assure la confidentialité de vos données de santé périnatale.
        </p>
      </div>
    </div>
  )
}
