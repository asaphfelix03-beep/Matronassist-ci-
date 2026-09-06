import Link from "next/link"
import { Compass } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Compass className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Page introuvable</h1>
            <p className="text-muted-foreground">Cette adresse ne correspond à aucune page de l'application.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1 h-12">
              <Link href="/dashboard">Mon espace</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 h-12">
              <Link href="/">Accueil</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
