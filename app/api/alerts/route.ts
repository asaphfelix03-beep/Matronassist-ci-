import { patientScope } from "@/lib/access"
import { handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { formatDate } from "@/lib/pregnancy"
import { prisma } from "@/lib/prisma"
import type { SystemAlert } from "@/lib/types"

export const dynamic = "force-dynamic"

const DAY = 24 * 60 * 60 * 1000

/** Au-delà de ce délai sans consultation, un suivi est considéré en retard. */
const FOLLOW_UP_OVERDUE_DAYS = 60

/**
 * Les alertes ne sont pas stockées: elles sont recalculées à partir de l'état
 * réel des dossiers, ce qui évite toute file d'alertes obsolètes à purger.
 *
 * Trois familles: constantes hors seuils, rendez-vous manqués, suivi en retard.
 */
export async function GET() {
  try {
    const user = await requireUser()
    const scope = patientScope(user)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdueBefore = new Date(Date.now() - FOLLOW_UP_OVERDUE_DAYS * DAY)

    const [underWatch, missedAppointments, patients] = await Promise.all([
      prisma.patient.findMany({
        where: { AND: [scope, { status: "alert" }] },
        select: {
          id: true,
          name: true,
          consultations: { orderBy: { date: "desc" }, take: 1, select: { bloodPressure: true, date: true } },
        },
      }),
      prisma.appointment.findMany({
        where: { patient: scope, status: "scheduled", date: { lt: today } },
        orderBy: { date: "asc" },
        include: { patient: { select: { id: true, name: true } } },
      }),
      prisma.patient.findMany({
        where: scope,
        select: {
          id: true,
          name: true,
          createdAt: true,
          consultations: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        },
      }),
    ])

    const alerts: SystemAlert[] = []

    for (const patient of underWatch) {
      const latest = patient.consultations[0]
      alerts.push({
        id: `watch-${patient.id}`,
        severity: "error",
        title: `${patient.name} est sous surveillance`,
        detail: latest?.bloodPressure
          ? `Dernière tension relevée: ${latest.bloodPressure} (le ${formatDate(latest.date)})`
          : "Constantes hors des seuils de vigilance",
        patientId: patient.id,
      })
    }

    for (const appointment of missedAppointments) {
      alerts.push({
        id: `missed-${appointment.id}`,
        severity: "warning",
        title: `Rendez-vous non clôturé — ${appointment.patient.name}`,
        detail: `Prévu le ${formatDate(appointment.date)} à ${appointment.time}, toujours marqué comme à venir`,
        patientId: appointment.patient.id,
      })
    }

    for (const patient of patients) {
      const lastVisit = patient.consultations[0]?.date ?? null
      const reference = lastVisit ?? patient.createdAt
      if (reference >= overdueBefore) continue

      alerts.push({
        id: `overdue-${patient.id}`,
        severity: "warning",
        title: `Suivi en retard — ${patient.name}`,
        detail: lastVisit
          ? `Aucune consultation depuis le ${formatDate(lastVisit)}`
          : `Dossier créé le ${formatDate(patient.createdAt)}, aucune consultation enregistrée`,
        patientId: patient.id,
      })
    }

    // Les incidents critiques remontent en tête.
    alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1))

    return ok(alerts)
  } catch (err) {
    return handleRouteError(err, "/api/alerts GET")
  }
}
