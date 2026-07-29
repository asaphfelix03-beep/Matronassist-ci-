"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, Shield, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const router = useRouter()

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById("features")
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <h1 className="text-lg font-bold text-primary">Matronassist-ci</h1>
          </div>
          <Link href="/login">
            <Button>Se connecter</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Heart className="w-10 h-10 fill-current" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-balance leading-tight">
            Suivi Maternel Connecté en Côte d'Ivoire
          </h1>
          <p className="text-xl text-muted-foreground text-balance">
            Une plateforme mobile pour améliorer le suivi de grossesse et renforcer le lien entre matrones et patientes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/login">
              <Button size="lg" className="text-lg h-14 px-8 gap-2">
                Commencer
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg h-14 px-8 bg-transparent" onClick={scrollToFeatures}>
              En savoir plus
            </Button>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
          <Card className="border-2">
            <CardContent className="p-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl">Pour les Administrateurs</h3>
              <p className="text-muted-foreground">
                Gérez les matrones, surveillez les alertes système et accédez aux rapports en temps réel.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/10 text-secondary-foreground">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl">Pour les Matrones</h3>
              <p className="text-muted-foreground">
                Suivez vos patientes, enregistrez les consultations et gérez les rendez-vous facilement.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent-foreground">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl">Pour les Patientes</h3>
              <p className="text-muted-foreground">
                Suivez votre grossesse, communiquez avec votre matrone et tenez un journal de bord.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Matronassist-ci. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
