import { z } from "zod"

import { badRequest, handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { readJsonBody } from "@/lib/api-validation"
import { checkPasswordPolicy, hashPassword, verifyPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"
import { createSession, revokeAllSessions } from "@/lib/session"

export const dynamic = "force-dynamic"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est obligatoire"),
  newPassword: z.string().min(1, "Le nouveau mot de passe est obligatoire"),
})

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = changePasswordSchema.parse((await readJsonBody(request)) ?? {})

    const account = await prisma.user.findUnique({ where: { id: user.id } })
    if (!account || !(await verifyPassword(input.currentPassword, account.passwordHash))) {
      throw badRequest("Mot de passe actuel incorrect")
    }

    const policyError = checkPasswordPolicy(input.newPassword)
    if (policyError) throw badRequest(policyError)

    if (await verifyPassword(input.newPassword, account.passwordHash)) {
      throw badRequest("Le nouveau mot de passe doit être différent de l'ancien")
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.newPassword), mustChangePassword: false },
    })

    // Toute session ouverte ailleurs est invalidée, puis on rouvre celle-ci.
    await revokeAllSessions(user.id)
    await createSession(user.id)

    return ok({ passwordChanged: true })
  } catch (err) {
    return handleRouteError(err, "/api/auth/password")
  }
}
