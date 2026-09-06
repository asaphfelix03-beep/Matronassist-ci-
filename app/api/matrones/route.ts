import { z } from "zod"

import { badRequest, handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { optionalText, readJsonBody } from "@/lib/api-validation"
import { generateTemporaryPassword, hashPassword } from "@/lib/password"
import { isUniqueViolation, prisma } from "@/lib/prisma"
import { serializeMatrone } from "@/lib/serializers"

export const dynamic = "force-dynamic"

const createMatroneSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire"),
  email: z.string().trim().min(1, "L'email est obligatoire").email("Email invalide"),
  region: z.string().trim().min(1, "La région est obligatoire"),
  phone: optionalText,
})

const withUser = {
  user: true,
  _count: { select: { patients: true } },
} as const

export async function GET() {
  try {
    await requireUser(["admin"])

    const matrones = await prisma.matrone.findMany({
      orderBy: { createdAt: "asc" },
      include: withUser,
    })

    return ok(matrones.map(serializeMatrone))
  } catch (err) {
    return handleRouteError(err, "/api/matrones GET")
  }
}

/**
 * Crée le compte de connexion et la fiche matrone en une transaction.
 * Le mot de passe provisoire n'est renvoyé qu'ici: il n'est stocké que haché et
 * ne pourra plus être relu ensuite.
 */
export async function POST(request: Request) {
  try {
    await requireUser(["admin"])
    const input = createMatroneSchema.parse((await readJsonBody(request)) ?? {})

    const temporaryPassword = generateTemporaryPassword()

    try {
      const user = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name,
          role: "matrone",
          passwordHash: await hashPassword(temporaryPassword),
          mustChangePassword: true,
          matrone: { create: { region: input.region, phone: input.phone ?? null } },
        },
        include: { matrone: { include: withUser } },
      })

      return ok({ matrone: serializeMatrone(user.matrone!), temporaryPassword }, 201)
    } catch (err) {
      if (isUniqueViolation(err)) throw badRequest("Un compte existe déjà avec cet email")
      throw err
    }
  } catch (err) {
    return handleRouteError(err, "/api/matrones POST")
  }
}
