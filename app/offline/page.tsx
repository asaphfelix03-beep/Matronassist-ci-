import { WifiOff } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

export const metadata = { title: "Hors ligne" }

/**
 * Page servie par le service worker quand une navigation échoue faute de réseau.
 * Elle doit rester purement statique: aucun appel réseau ne peut aboutir ici.
 */
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center">
            <WifiOff className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Vous êtes hors ligne</h1>
            <p className="text-muted-foreground">
              Cette page n'a pas encore été consultée sur cet appareil, elle ne peut donc pas s'afficher sans réseau.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Vos saisies effectuées hors ligne sont conservées et partiront automatiquement dès le retour de la
            connexion.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
