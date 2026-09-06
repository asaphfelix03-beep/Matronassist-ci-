import { patientScope } from "@/lib/access"
import { handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { expireStaleCalls } from "@/lib/calls"
import { prisma } from "@/lib/prisma"
import { serializeCall } from "@/lib/serializers"

export const dynamic = "force-dynamic"

/**
 * Appel entrant destiné à l'utilisateur courant, s'il y en a un.
 * Sondé régulièrement par le client: c'est ce qui déclenche la sonnerie.
 */
export async function GET() {
  try {
    const user = await requireUser()

    // Les appels ne concernent que patientes et matrones référentes.
    if (user.role !== "patiente" && user.role !== "matrone") {
      return ok(null)
    }

    await expireStaleCalls()

    const call = await prisma.call.findFirst({
      where: {
        status: "ringing",
        callerId: { not: user.id },
        patient: patientScope(user),
      },
      orderBy: { createdAt: "desc" },
      include: { patient: { select: { name: true } }, caller: { select: { name: true } } },
    })

    return ok(call ? serializeCall(call, user.id) : null)
  } catch (err) {
    return handleRouteError(err, "/api/calls/incoming GET")
  }
}
