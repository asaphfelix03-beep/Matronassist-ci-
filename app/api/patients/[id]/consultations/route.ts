import { z } from "zod"

import { requireCaregiver, requirePatient } from "@/lib/access"
import { handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { optionalText, readJsonBody } from "@/lib/api-validation"
import { prisma } from "@/lib/prisma"
import { serializeConsultation } from "@/lib/serializers"
import { isVitalsAlerting } from "@/lib/vitals"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

const createConsultationSchema = z.object({
  type: z.string().trim().min(1, "Le type de consultation est obligatoire"),
  notes: z.string().trim().min(1, "Les observations sont obligatoires"),
  date: z.coerce.date({ errorMap: () => ({ message: "Date invalide" }) }).default(() => new Date()),
  bloodPressure: optionalText,
  weight: optionalText,
  temperature: optionalText,
  heartRate: optionalText,
})

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    await requirePatient(user, id)

    const consultations = await prisma.consultation.findMany({
      where: { patientId: id },
      orderBy: { date: "desc" },
      include: { recordedBy: { select: { name: true } } },
    })

    return ok(consultations.map(serializeConsultation))
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id]/consultations GET")
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    requireCaregiver(user)

    const { id } = await context.params
    await requirePatient(user, id)

    const input = createConsultationSchema.parse((await readJsonBody(request)) ?? {})

    const consultation = await prisma.consultation.create({
      data: {
        patientId: id,
        type: input.type,
        notes: input.notes,
        date: input.date,
        bloodPressure: input.bloodPressure ?? null,
        weight: input.weight ?? null,
        temperature: input.temperature ?? null,
        heartRate: input.heartRate ?? null,
        recordedById: user.id,
      },
      include: { recordedBy: { select: { name: true } } },
    })

    // Le statut suit les constantes les plus récentes: on relit la dernière
    // consultation plutôt que celle qu'on vient d'insérer, qui peut être une
    // saisie rétroactive.
    const latest = await prisma.consultation.findFirst({
      where: { patientId: id },
      orderBy: { date: "desc" },
    })
    const status = latest && isVitalsAlerting(latest) ? "alert" : "stable"
    await prisma.patient.update({ where: { id }, data: { status } })

    return ok({ consultation: serializeConsultation(consultation), patientStatus: status }, 201)
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id]/consultations POST")
  }
}
