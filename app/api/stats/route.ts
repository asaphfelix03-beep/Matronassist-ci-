import { patientScope } from "@/lib/access"
import { handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import type { DashboardStats } from "@/lib/types"

export const dynamic = "force-dynamic"

/** Compteurs calculés dans le périmètre de l'utilisateur. */
export async function GET() {
  try {
    const user = await requireUser()
    const scope = patientScope(user)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const [totalMatrones, activeMatrones, totalPatients, patientsUnderWatch, upcomingAppointments, consultationsThisMonth] =
      await Promise.all([
        user.role === "admin" ? prisma.matrone.count() : Promise.resolve(0),
        user.role === "admin" ? prisma.matrone.count({ where: { user: { isActive: true } } }) : Promise.resolve(0),
        prisma.patient.count({ where: scope }),
        prisma.patient.count({ where: { AND: [scope, { status: "alert" }] } }),
        prisma.appointment.count({ where: { patient: scope, status: "scheduled", date: { gte: today } } }),
        prisma.consultation.count({ where: { patient: scope, date: { gte: monthStart } } }),
      ])

    const stats: DashboardStats = {
      totalMatrones,
      activeMatrones,
      totalPatients,
      patientsUnderWatch,
      upcomingAppointments,
      consultationsThisMonth,
    }

    return ok(stats)
  } catch (err) {
    return handleRouteError(err, "/api/stats GET")
  }
}
