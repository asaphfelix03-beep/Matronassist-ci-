import { z } from "zod"

import { requirePatient } from "@/lib/access"
import { forbidden, handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { optionalText, readJsonBody } from "@/lib/api-validation"
import { prisma } from "@/lib/prisma"
import { serializeFetalMovement } from "@/lib/serializers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

const createMovementSchema = z.object({
  count: z.coerce.number().int().min(0, "Le comptage ne peut pas être négatif").max(200, "Comptage invalide"),
  recordedAt: z.coerce.date({ errorMap: () => ({ message: "Date invalide" }) }).default(() => new Date()),
  notes: optionalText,
})

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    await requirePatient(user, id)

    const movements = await prisma.fetalMovement.findMany({
      where: { patientId: id },
      orderBy: { recordedAt: "desc" },
      take: 60,
    })

    return ok(movements.map(serializeFetalMovement))
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id]/movements GET")
  }
}

/** Relevé saisi par la patiente elle-même. */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    await requirePatient(user, id)

    if (user.role !== "patiente" || user.patientId !== id) {
      throw forbidden()
    }

    const input = createMovementSchema.parse((await readJsonBody(request)) ?? {})

    const movement = await prisma.fetalMovement.create({
      data: { patientId: id, count: input.count, recordedAt: input.recordedAt, notes: input.notes ?? null },
    })

    return ok(serializeFetalMovement(movement), 201)
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id]/movements POST")
  }
}
