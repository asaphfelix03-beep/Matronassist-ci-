"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Erreur non rattrapée dans une page. Aucun détail technique n'est montré:
 * l'utilisateur est une matrone ou une patiente, pas un développeur.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Erreur de rendu", error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
            <p className="text-muted-foreground">
              L'affichage de cette page a échoué. Vos données n'ont pas été perdues.
            </p>
          </div>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono">
              Référence à communiquer au support : {error.digest}
            </p>
          )}
          <Button onClick={reset} className="gap-2 w-full h-12">
            <RotateCcw className="w-4 h-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
