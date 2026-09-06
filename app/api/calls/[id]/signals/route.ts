import { z } from "zod"

import { badRequest, handleRouteError, notFound, ok, requireUser } from "@/lib/api-auth"
import { readJsonBody } from "@/lib/api-validation"
import { requireCallParticipant } from "@/lib/calls"
import { prisma } from "@/lib/prisma"
import { serializeCallSignal } from "@/lib/serializers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

const signalSchema = z.object({
  kind: z.enum(["offer", "answer", "candidate"]),
  // SDP et candidats ICE sont relayés tels quels: le serveur ne les interprète pas.
  payload: z.string().min(1, "Charge utile vide").max(20000, "Charge utile trop volumineuse"),
})

async function loadCall(callId: string, user: Parameters<typeof requireCallParticipant>[0]) {
  const call = await prisma.call.findUnique({ where: { id: callId }, select: { id: true, patientId: true, status: true } })
  if (!call) throw notFound("Appel")

  await requireCallParticipant(user, call.patientId)

  return call
}

/**
 * Signaux émis par l'autre partie depuis `since`.
 * Le client sonde cette route pendant la négociation WebRTC.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    await loadCall(id, user)

    const since = new URL(request.url).searchParams.get("since")
    const after = since ? new Date(since) : null

    const signals = await prisma.callSignal.findMany({
      where: {
        callId: id,
        senderId: { not: user.id },
        ...(after && !Number.isNaN(after.getTime()) ? { createdAt: { gt: after } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    })

    return ok(signals.map(serializeCallSignal))
  } catch (err) {
    return handleRouteError(err, "/api/calls/[id]/signals GET")
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    const call = await loadCall(id, user)

    if (call.status !== "ringing" && call.status !== "active") {
      throw badRequest("Cet appel est terminé")
    }

    const input = signalSchema.parse((await readJsonBody(request)) ?? {})

    const signal = await prisma.callSignal.create({
      data: { callId: id, senderId: user.id, kind: input.kind, payload: input.payload },
    })

    return ok(serializeCallSignal(signal), 201)
  } catch (err) {
    return handleRouteError(err, "/api/calls/[id]/signals POST")
  }
}
