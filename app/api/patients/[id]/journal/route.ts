import { z } from "zod"

import { requirePatient } from "@/lib/access"
import { forbidden, handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { readJsonBody } from "@/lib/api-validation"
import { prisma } from "@/lib/prisma"
import { serializeJournalEntry } from "@/lib/serializers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

const createEntrySchema = z.object({
  content: z.string().trim().min(1, "Le contenu est obligatoire").max(5000, "Entrée trop longue"),
  date: z.coerce.date({ errorMap: () => ({ message: "Date invalide" }) }).default(() => new Date()),
})

/** Le journal est consultable par l'équipe soignante, mais écrit par la patiente. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    const patient = await requirePatient(user, id)

    const entries = await prisma.journalEntry.findMany({
      where: { patientId: id },
      orderBy: { date: "desc" },
    })

    return ok(entries.map((entry) => serializeJournalEntry(entry, patient.pregnancyStart)))
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id]/journal GET")
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    const patient = await requirePatient(user, id)

    if (user.role !== "patiente" || user.patientId !== id) {
      throw forbidden()
    }

    const input = createEntrySchema.parse((await readJsonBody(request)) ?? {})

    const entry = await prisma.journalEntry.create({
      data: { patientId: id, content: input.content, date: input.date },
    })

    return ok(serializeJournalEntry(entry, patient.pregnancyStart), 201)
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id]/journal POST")
  }
}
