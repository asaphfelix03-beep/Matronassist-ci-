import { patientScope } from "@/lib/access"
import { handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { expireStaleCalls } from "@/lib/calls"
import { prisma } from "@/lib/prisma"
import { serializeCall } from "@/lib/serializers"
import type { NotificationSnapshot, UnreadThread } from "@/lib/types"

export const dynamic = "force-dynamic"

/** Au-delà, la liste déroulante devient illisible: le compteur suffit. */
const MAX_THREADS = 12

/**
 * Instantané unique de tout ce qui doit réveiller l'interface: messages non lus
 * et appel entrant.
 *
 * Un seul appel plutôt que deux (messages + appels) car cette route est sondée
 * en continu: chaque requête évitée est de la batterie et des données mobiles
 * économisées, ce qui compte sur les réseaux visés.
 *
 * La lecture ne marque jamais un message comme lu — c'est le rôle de l'ouverture
 * du fil. Sans cela, une notification s'effacerait avant d'avoir été vue.
 */
export async function GET() {
  try {
    const user = await requireUser()
    const scope = patientScope(user)

    // L'administration suit le réseau mais ne participe ni aux fils ni aux appels.
    if (user.role === "admin") {
      const empty: NotificationSnapshot = { threads: [], unreadTotal: 0, incomingCall: null }
      return ok(empty)
    }

    await expireStaleCalls()

    const [unreadMessages, ringing] = await Promise.all([
      prisma.message.findMany({
        where: { patient: scope, senderId: { not: user.id }, readAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          patientId: true,
          body: true,
          createdAt: true,
          patient: { select: { name: true } },
          sender: { select: { name: true } },
        },
      }),
      prisma.call.findFirst({
        where: { status: "ringing", callerId: { not: user.id }, patient: scope },
        orderBy: { createdAt: "desc" },
        include: { patient: { select: { name: true } }, caller: { select: { name: true } } },
      }),
    ])

    // Regroupement par dossier: une matrone suivant plusieurs patientes doit voir
    // d'où viennent les messages, pas seulement combien il y en a.
    const byPatient = new Map<string, UnreadThread>()
    for (const message of unreadMessages) {
      const existing = byPatient.get(message.patientId)
      if (existing) {
        existing.unread += 1
        continue
      }
      // Les messages arrivent du plus récent au plus ancien: le premier vu pour
      // un dossier est donc bien le dernier reçu.
      byPatient.set(message.patientId, {
        patientId: message.patientId,
        patientName: message.patient.name,
        unread: 1,
        lastMessageId: message.id,
        lastMessage: message.body,
        lastSenderName: message.sender.name,
        lastMessageAt: message.createdAt.toISOString(),
      })
    }

    const threads = [...byPatient.values()]
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
      .slice(0, MAX_THREADS)

    const snapshot: NotificationSnapshot = {
      threads,
      unreadTotal: unreadMessages.length,
      incomingCall: ringing ? serializeCall(ringing, user.id) : null,
    }

    return ok(snapshot)
  } catch (err) {
    return handleRouteError(err, "/api/notifications GET")
  }
}
