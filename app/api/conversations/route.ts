import { patientScope } from "@/lib/access"
import { handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import type { Conversation } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * Un fil par patiente du périmètre, trié par activité récente.
 * Les patientes sans message apparaissent aussi, pour pouvoir engager la discussion.
 */
export async function GET() {
  try {
    const user = await requireUser()

    const patients = await prisma.patient.findMany({
      where: patientScope(user),
      select: {
        id: true,
        name: true,
        // `userId` dit si la patiente a un compte: sans compte, elle ne peut ni
        // répondre ni décrocher, et l'interface doit masquer les boutons d'appel.
        userId: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true } },
        _count: { select: { messages: { where: { senderId: { not: user.id }, readAt: null } } } },
      },
    })

    const conversations: Conversation[] = patients
      .map((patient) => ({
        patientId: patient.id,
        patientName: patient.name,
        lastMessage: patient.messages[0]?.body ?? null,
        lastMessageAt: patient.messages[0]?.createdAt.toISOString() ?? null,
        unread: patient._count.messages,
        canReply: patient.userId !== null,
      }))
      .sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt) return b.lastMessageAt.localeCompare(a.lastMessageAt)
        if (a.lastMessageAt) return -1
        if (b.lastMessageAt) return 1
        return a.patientName.localeCompare(b.patientName, "fr")
      })

    return ok(conversations)
  } catch (err) {
    return handleRouteError(err, "/api/conversations GET")
  }
}
