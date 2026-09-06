import { z } from "zod"

import { requireCaregiver, requirePatient } from "@/lib/access"
import { badRequest, handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { optionalDate, optionalInt, optionalText, readJsonBody } from "@/lib/api-validation"
import { prisma } from "@/lib/prisma"
import { patientDetailInclude, serializePatientDetail } from "@/lib/serializers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

const updatePatientSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire").optional(),
  age: optionalInt,
  phone: optionalText,
  address: optionalText,
  notes: optionalText,
  pregnancyStart: optionalDate,
  expectedDelivery: optionalDate,
  matroneId: optionalText,
})

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params

    const patient = await requirePatient(user, id, patientDetailInclude())

    return ok(serializePatientDetail(patient))
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id] GET")
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    requireCaregiver(user)

    const { id } = await context.params
    await requirePatient(user, id)

    const body = (await readJsonBody(request)) ?? {}
    const input = updatePatientSchema.parse(body)
    const provided = new Set(Object.keys(body as Record<string, unknown>))

    // Seul l'admin réaffecte une patiente à une autre matrone.
    if (provided.has("matroneId") && user.role !== "admin") {
      throw badRequest("Seul un administrateur peut réaffecter une patiente")
    }

    if (provided.has("matroneId") && input.matroneId) {
      const matrone = await prisma.matrone.findUnique({ where: { id: input.matroneId }, select: { id: true } })
      if (!matrone) throw badRequest("Matrone introuvable")
    }

    const data = Object.fromEntries(
      Object.entries(input).filter(([key]) => provided.has(key)),
    ) as Record<string, unknown>

    const patient = await prisma.patient.update({
      where: { id },
      data,
      include: patientDetailInclude(),
    })

    return ok(serializePatientDetail(patient))
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id] PATCH")
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser(["admin"])
    const { id } = await context.params

    const patient = await requirePatient(user, id)

    // Consultations, RDV, journal, mouvements et messages partent en cascade;
    // le compte de connexion associé est supprimé avec le dossier.
    await prisma.patient.delete({ where: { id } })
    if (patient.userId) {
      await prisma.user.delete({ where: { id: patient.userId } }).catch(() => {})
    }

    return ok({ deleted: true })
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id] DELETE")
  }
}
