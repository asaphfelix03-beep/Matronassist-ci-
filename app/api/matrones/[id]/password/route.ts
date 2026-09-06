import { handleRouteError, notFound, ok, requireUser } from "@/lib/api-auth"
import { generateTemporaryPassword, hashPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"
import { revokeAllSessions } from "@/lib/session"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Réinitialise le mot de passe d'une matrone et renvoie le nouveau code
 * provisoire, à transmettre hors ligne. Les sessions en cours sont coupées.
 */
export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireUser(["admin"])
    const { id } = await context.params

    const matrone = await prisma.matrone.findUnique({ where: { id }, select: { userId: true } })
    if (!matrone) throw notFound("Matrone")

    const temporaryPassword = generateTemporaryPassword()

    await prisma.user.update({
      where: { id: matrone.userId },
      data: { passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true },
    })
    await revokeAllSessions(matrone.userId)

    return ok({ temporaryPassword })
  } catch (err) {
    return handleRouteError(err, "/api/matrones/[id]/password POST")
  }
}
