import { redirect } from "next/navigation"

import { AdminDashboard } from "@/components/admin-dashboard"
import { CallProvider } from "@/components/call-center"
import { MatroneDashboard } from "@/components/matrone-dashboard"
import { Navbar } from "@/components/navbar"
import { PatienteDashboard } from "@/components/patiente-dashboard"
import { getSessionUser } from "@/lib/session"

export const dynamic = "force-dynamic"

const GREETINGS: Record<string, string> = {
  admin: "Voici l'état du réseau aujourd'hui.",
  matrone: "Voici le suivi de vos patientes aujourd'hui.",
  patiente: "Voici le suivi de votre grossesse.",
}

/**
 * Garde d'accès côté serveur: la session est vérifiée avant tout rendu, si bien
 * qu'aucune donnée n'est envoyée au navigateur sans droit correspondant.
 */
export default async function DashboardPage() {
  const user = await getSessionUser()

  if (!user) redirect("/login")
  if (user.mustChangePassword) redirect("/change-password")

  return (
    <CallProvider role={user.role}>
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar user={user} />

        {/* La marge basse dégage la barre de navigation fixe du mobile. */}
        <div className="p-4 pb-24 md:p-8 max-w-5xl mx-auto w-full space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold">Bonjour, {user.name}</h2>
            <p className="text-muted-foreground">{GREETINGS[user.role]}</p>
          </div>

          {user.role === "admin" && <AdminDashboard />}
          {user.role === "matrone" && <MatroneDashboard />}
          {user.role === "patiente" && <PatienteDashboard patientId={user.patientId} />}
        </div>
      </div>
    </CallProvider>
  )
}
