"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, Loader2 } from "lucide-react"
import { changePassword } from "@/lib/api-client"
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy"

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmation) {
      setError("La confirmation ne correspond pas au nouveau mot de passe")
      return
    }

    setIsSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      router.replace("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible")
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-2">
      <CardHeader>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-2">
          <KeyRound className="w-6 h-6" />
        </div>
        <CardTitle>{forced ? "Choisissez votre mot de passe" : "Modifier le mot de passe"}</CardTitle>
        <CardDescription>
          {forced
            ? "Votre compte utilise un mot de passe provisoire. Définissez-en un nouveau pour accéder à votre espace."
            : "Toutes vos autres sessions seront déconnectées."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{forced ? "Mot de passe provisoire" : "Mot de passe actuel"}</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Au moins {PASSWORD_MIN_LENGTH} caractères, dont une lettre et un chiffre.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmation">Confirmation</Label>
            <Input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full h-12 font-bold" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
