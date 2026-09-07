import { z } from "zod"

import { requirePatient } from "@/lib/access"
import { handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { readJsonBody } from "@/lib/api-validation"
import { prisma } from "@/lib/prisma"
import { serializeMessage } from "@/lib/serializers"
import type { MessageFeed } from "@/lib/types"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

const createMessageSchema = z.object({
  body: z.string().trim().min(1, "Le message ne peut pas être vide").max(2000, "Message trop long"),
})

const withSender = { sender: { select: { id: true, name: true, role: true } } } as const

/**
 * Fil de discussion d'une patiente. La lecture marque comme lus les messages
 * reçus par l'utilisateur courant.
 *
 * `?since=<ISO>` ne renvoie que les messages postérieurs: c'est ce qui permet au
 * client de rafraîchir le fil en continu sans le recharger entièrement.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    await requirePatient(user, id)

    const since = new URL(request.url).searchParams.get("since")
    const after = since ? new Date(since) : null

    const messages = await prisma.message.findMany({
      where: {
        patientId: id,
        ...(after && !Number.isNaN(after.getTime()) ? { createdAt: { gt: after } } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: withSender,
    })

    await prisma.message.updateMany({
      where: { patientId: id, senderId: { not: user.id }, readAt: null },
      data: { readAt: new Date() },
    })

    // Accusé de lecture: date du dernier de MES messages que le correspondant a
    // lu. Le rafraîchissement incrémental ne renvoie que les nouveaux messages,
    // si bien qu'un `readAt` posé après coup ne parviendrait jamais à l'auteur.
    // Cette borne unique suffit à marquer comme lus tous les messages antérieurs.
    const lastRead = await prisma.message.findFirst({
      where: { patientId: id, senderId: user.id, readAt: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })

    const payload: MessageFeed = {
      messages: messages.map((message) => serializeMessage(message, user.id)),
      readUpTo: lastRead?.createdAt.toISOString() ?? null,
    }

    return ok(payload)
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id]/messages GET")
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    await requirePatient(user, id)

    const input = createMessageSchema.parse((await readJsonBody(request)) ?? {})

    const message = await prisma.message.create({
      data: { patientId: id, senderId: user.id, body: input.body },
      include: withSender,
    })

    return ok(serializeMessage(message, user.id), 201)
  } catch (err) {
    return handleRouteError(err, "/api/patients/[id]/messages POST")
  }
}
