import { z } from "zod"

import { badRequest, handleRouteError, notFound, ok, requireUser } from "@/lib/api-auth"
import { readJsonBody } from "@/lib/api-validation"
import { expireStaleCalls, requireCallParticipant } from "@/lib/calls"
import { prisma } from "@/lib/prisma"
import { serializeCall } from "@/lib/serializers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

const actionSchema = z.object({
  action: z.enum(["accept", "decline", "end"]),
})

const withParties = { patient: { select: { name: true } }, caller: { select: { name: true } } } as const

/** Charge un appel en vérifiant que l'utilisateur en est bien une des parties. */
async function loadCall(userId: string, callId: string, user: Parameters<typeof requireCallParticipant>[0]) {
  const call = await prisma.call.findUnique({ where: { id: callId }, include: withParties })
  if (!call) throw notFound("Appel")

  await requireCallParticipant(user, call.patientId)

  return call
}

/** État courant de l'appel: sondé par les deux parties pendant la négociation. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params

    await expireStaleCalls()
    const call = await loadCall(user.id, id, user)

    return ok(serializeCall(call, user.id))
  } catch (err) {
    return handleRouteError(err, "/api/calls/[id] GET")
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params

    const { action } = actionSchema.parse((await readJsonBody(request)) ?? {})
    const call = await loadCall(user.id, id, user)

    if (call.status === "ended" || call.status === "declined" || call.status === "missed") {
      throw badRequest("Cet appel est terminé")
    }

    // Décrocher ou refuser n'appartient qu'au destinataire de l'appel.
    if ((action === "accept" || action === "decline") && call.callerId === user.id) {
      throw badRequest("Vous êtes à l'origine de cet appel")
    }

    if (action === "accept" && call.status !== "ringing") {
      throw badRequest("Cet appel ne sonne plus")
    }

    const data =
      action === "accept"
        ? { status: "active", startedAt: new Date() }
        : action === "decline"
          ? { status: "declined", endedAt: new Date() }
          : { status: "ended", endedAt: new Date() }

    const updated = await prisma.call.update({ where: { id }, data, include: withParties })

    return ok(serializeCall(updated, user.id))
  } catch (err) {
    return handleRouteError(err, "/api/calls/[id] PATCH")
  }
}
