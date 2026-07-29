"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import type { UserRole } from "@/lib/types"
import { AdminDashboard } from "@/components/admin-dashboard"
import { MatroneDashboard } from "@/components/matrone-dashboard"
import { PatienteDashboard } from "@/components/patiente-dashboard"

export default function DashboardPage() {
  const [role, setRole] = useState<UserRole | null>(null)
  const router = useRouter()

  useEffect(() => {
    const storedRole = localStorage.getItem("userRole") as UserRole
    if (!storedRole) {
      router.push("/login")
    } else {
      setRole(storedRole)
    }
  }, [router])

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar role={role} />

      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">
            Bonjour, {localStorage.getItem("userEmail")?.split("@")[0] || "Utilisateur"}
          </h2>
          <p className="text-muted-foreground">Voici le suivi de vos activités aujourd'hui.</p>
        </div>

        {/* Role-based Dashboard content */}
        {role === "matrone" && <MatroneDashboard />}
        {role === "patiente" && <PatienteDashboard />}
        {role === "admin" && <AdminDashboard />}
      </div>
    </div>
  )
}
