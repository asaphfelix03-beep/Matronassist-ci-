import { z } from "zod"

import { patientScope, requireCaregiver, requirePatient } from "@/lib/access"
import { handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { readJsonBody } from "@/lib/api-validation"
import { prisma } from "@/lib/prisma"
import { serializeAppointment } from "@/lib/serializers"

export const dynamic = "force-dynamic"

const createAppointmentSchema = z.object({
  patientId: z.string().trim().min(1, "La patiente est obligatoire"),
  date: z.coerce.date({ errorMap: () => ({ message: "Date invalide" }) }),
  time: z.string().trim().min(1, "L'heure est obligatoire"),
  type: z.string().trim().min(1, "Le type de rendez-vous est obligatoire"),
})

/** Un rendez-vous du jour reste « à venir » jusqu'à la fin de la journée. */
function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const includePast = new URL(request.url).searchParams.get("includePast") === "true"

    const appointments = await prisma.appointment.findMany({
      where: {
        patient: patientScope(user),
        ...(includePast ? {} : { date: { gte: startOfToday() } }),
      },
      orderBy: { date: "asc" },
      include: { patient: { select: { name: true } } },
    })

    return ok(appointments.map((appointment) => serializeAppointment(appointment, appointment.patient.name)))
  } catch (err) {
    return handleRouteError(err, "/api/appointments GET")
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    requireCaregiver(user)

    const input = createAppointmentSchema.parse((await readJsonBody(request)) ?? {})
    const patient = await requirePatient(user, input.patientId)

    const appointment = await prisma.appointment.create({
      data: { patientId: patient.id, date: input.date, time: input.time, type: input.type },
    })

    return ok(serializeAppointment(appointment, patient.name), 201)
  } catch (err) {
    return handleRouteError(err, "/api/appointments POST")
  }
}
