import { z } from "zod"

import { badRequest, handleRouteError, notFound, ok, requireUser } from "@/lib/api-auth"
import { optionalText, readJsonBody } from "@/lib/api-validation"
import { prisma } from "@/lib/prisma"
import { serializeMatrone } from "@/lib/serializers"
import { revokeAllSessions } from "@/lib/session"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

const updateMatroneSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire").optional(),
  region: z.string().trim().min(1, "La région est obligatoire").optional(),
  phone: optionalText,
  isActive: z.boolean().optional(),
})

const withUser = {
  user: true,
  _count: { select: { patients: true } },
} as const

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireUser(["admin"])
    const { id } = await context.params

    const matrone = await prisma.matrone.findUnique({ where: { id }, include: withUser })
    if (!matrone) throw notFound("Matrone")

    return ok(serializeMatrone(matrone))
  } catch (err) {
    return handleRouteError(err, "/api/matrones/[id] GET")
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireUser(["admin"])
    const { id } = await context.params

    const body = (await readJsonBody(request)) ?? {}
    const input = updateMatroneSchema.parse(body)
    const provided = new Set(Object.keys(body as Record<string, unknown>))

    const existing = await prisma.matrone.findUnique({ where: { id }, select: { userId: true } })
    if (!existing) throw notFound("Matrone")

    const matrone = await prisma.matrone.update({
      where: { id },
      data: {
        ...(provided.has("region") ? { region: input.region } : {}),
        ...(provided.has("phone") ? { phone: input.phone ?? null } : {}),
        ...(provided.has("name") || provided.has("isActive")
          ? {
              user: {
                update: {
                  ...(provided.has("name") ? { name: input.name } : {}),
                  ...(provided.has("isActive") ? { isActive: input.isActive } : {}),
                },
              },
            }
          : {}),
      },
      include: withUser,
    })

    // Désactiver un compte doit couper immédiatement ses sessions ouvertes.
    if (input.isActive === false) {
      await revokeAllSessions(existing.userId)
    }

    return ok(serializeMatrone(matrone))
  } catch (err) {
    return handleRouteError(err, "/api/matrones/[id] PATCH")
  }
}

/**
 * Le compte est désactivé plutôt que supprimé tant qu'il reste des patientes
 * rattachées: leur historique médical doit conserver la matrone référente.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireUser(["admin"])
    const { id } = await context.params

    const matrone = await prisma.matrone.findUnique({
      where: { id },
      select: { userId: true, _count: { select: { patients: true } } },
    })
    if (!matrone) throw notFound("Matrone")

    if (matrone._count.patients > 0) {
      throw badRequest(
        `Ce compte suit encore ${matrone._count.patients} patiente(s). Réaffectez-les avant de le supprimer, ou désactivez le compte.`,
      )
    }

    // La fiche matrone est supprimée en cascade avec son compte.
    await prisma.user.delete({ where: { id: matrone.userId } })

    return ok({ deleted: true })
  } catch (err) {
    return handleRouteError(err, "/api/matrones/[id] DELETE")
  }
}
