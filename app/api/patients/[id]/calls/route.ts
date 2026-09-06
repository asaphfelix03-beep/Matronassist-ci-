import { z } from "zod"

import { badRequest, handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { readJsonBody } from "@/lib/api-validation"
import { expireStaleCalls, requireCallParticipant } from "@/lib/calls"
import { prisma } from "@/lib/prisma"
import { serializeCall } from "@/lib/serializers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

const startCallSchema = z.object({
  withVideo: z.boolean().default(false),
})

const withParties = { patient: { select: { name: true } }, caller: { select: { name: true } } } as const

/** Historique des appels de la patiente, du plus récent au plus ancien. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    await requireCallParticipant(user, id)
    await expireStaleCalls()

    const calls = await prisma.call.findMany({
      where: { patientId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: withParties,
    })

    return ok(calls.map((call) => serializeCall(call, user.id)))
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id]/calls GET")
  }
}

/** Lance un appel: il « sonne » jusqu'à ce que l'autre partie décroche ou expire. */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    const patient = await requireCallParticipant(user, id)

    // Un appel n'aboutit que si le correspondant dispose d'un compte pour décrocher.
    const calleeId = user.role === "patiente" ? patient.matrone?.userId : patient.userId
    if (!calleeId) {
      throw badRequest(
        user.role === "patiente"
          ? "Aucune matrone référente n'est rattachée à votre dossier"
          : "Cette patiente n'a pas d'accès à l'application : elle ne peut pas recevoir d'appel",
      )
    }

    const input = startCallSchema.parse((await readJsonBody(request)) ?? {})

    await expireStaleCalls()

    const ongoing = await prisma.call.findFirst({
      where: { patientId: id, status: { in: ["ringing", "active"] } },
      include: withParties,
    })
    if (ongoing) {
      throw badRequest("Un appel est déjà en cours pour ce dossier")
    }

    const call = await prisma.call.create({
      data: { patientId: id, callerId: user.id, withVideo: input.withVideo },
      include: withParties,
    })

    return ok(serializeCall(call, user.id), 201)
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id]/calls POST")
  }
}
