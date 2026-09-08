import { z } from "zod"

import { patientScope } from "@/lib/access"
import { handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { readJsonBody } from "@/lib/api-validation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const acknowledgeSchema = z.object({
  /** Appels visés; vide signifie « tous ceux que je n'ai pas encore vus ». */
  callIds: z.array(z.string().trim().min(1)).max(50).optional(),
})

/**
 * Marque des appels manqués comme vus.
 *
 * Le périmètre habituel s'applique et `callerId: { not: user.id }` garantit
 * qu'on ne peut acquitter que les appels qu'on a soi-même ratés, jamais ceux
 * d'un tiers.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = acknowledgeSchema.parse((await readJsonBody(request)) ?? {})

    const result = await prisma.call.updateMany({
      where: {
        status: "missed",
        acknowledgedAt: null,
        callerId: { not: user.id },
        patient: patientScope(user),
        ...(input.callIds?.length ? { id: { in: input.callIds } } : {}),
      },
      data: { acknowledgedAt: new Date() },
    })

    return ok({ acknowledged: result.count })
  } catch (err) {
    return handleRouteError(err, "/api/calls/missed POST")
  }
}
