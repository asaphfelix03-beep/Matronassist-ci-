import { z } from "zod"

import { badRequest, handleRouteError, ok } from "@/lib/api-auth"
import { readJsonBody } from "@/lib/api-validation"
import { verifyPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"
import { createSession } from "@/lib/session"

export const dynamic = "force-dynamic"

const loginSchema = z.object({
  email: z.string().trim().min(1, "L'email est obligatoire").email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est obligatoire"),
})

/**
 * Un identifiant inconnu, un mot de passe faux et un compte désactivé renvoient
 * le même message: on ne confirme pas l'existence d'un compte à un tiers.
 */
const INVALID_CREDENTIALS = "Identifiants incorrects"

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.parse((await readJsonBody(request)) ?? {})
    const email = parsed.email.toLowerCase()

    const user = await prisma.user.findUnique({ where: { email } })

    // Le hachage est exécuté même sans compte correspondant, pour que la durée de
    // la réponse ne révèle pas si l'email est enregistré.
    const stored = user?.passwordHash ?? "scrypt$16384$8$1$aaaaaaaaaaaaaaaaaaaaaa==$aaaaaaaaaaaaaaaaaaaaaa=="
    const passwordMatches = await verifyPassword(parsed.password, stored)

    if (!user || !passwordMatches || !user.isActive) {
      throw badRequest(INVALID_CREDENTIALS)
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await createSession(user.id)

    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    })
  } catch (err) {
    return handleRouteError(err, "/api/auth/login")
  }
}
