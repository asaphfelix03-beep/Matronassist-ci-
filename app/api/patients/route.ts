import { z } from "zod"

import { patientScope, requireCaregiver } from "@/lib/access"
import { badRequest, handleRouteError, ok, requireUser } from "@/lib/api-auth"
import { optionalDate, optionalInt, optionalText, readJsonBody } from "@/lib/api-validation"
import { generateTemporaryPassword, hashPassword } from "@/lib/password"
import { estimatedDelivery } from "@/lib/pregnancy"
import { isUniqueViolation, prisma } from "@/lib/prisma"
import { patientListInclude, serializePatient } from "@/lib/serializers"

export const dynamic = "force-dynamic"

const createPatientSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire"),
  age: optionalInt,
  phone: optionalText,
  address: optionalText,
  notes: optionalText,
  pregnancyStart: optionalDate,
  expectedDelivery: optionalDate,
  /** Réservé à l'admin: rattacher la patiente à une matrone donnée. */
  matroneId: optionalText,
  /** Si renseigné, un accès à l'espace patiente est créé avec cet email. */
  loginEmail: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().email("Email invalide").nullish(),
  ),
})

export async function GET() {
  try {
    const user = await requireUser()

    const patients = await prisma.patient.findMany({
      where: patientScope(user),
      orderBy: { createdAt: "asc" },
      include: patientListInclude(),
    })

    return ok(patients.map(serializePatient))
  } catch (err) {
    return handleRouteError(err, "/api/patients GET")
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    requireCaregiver(user)

    const input = createPatientSchema.parse((await readJsonBody(request)) ?? {})

    // Une matrone ne crée que dans son propre portefeuille; l'admin choisit.
    const matroneId = user.role === "matrone" ? user.matroneId : (input.matroneId ?? null)

    if (user.role === "matrone" && !matroneId) {
      throw badRequest("Votre compte n'est rattaché à aucune fiche matrone")
    }

    if (user.role === "admin" && matroneId) {
      const matrone = await prisma.matrone.findUnique({ where: { id: matroneId }, select: { id: true } })
      if (!matrone) throw badRequest("Matrone introuvable")
    }

    // Sans date fournie, le terme est déduit du début de grossesse (280 jours).
    const expectedDelivery = input.expectedDelivery ?? estimatedDelivery(input.pregnancyStart ?? null)

    const temporaryPassword = input.loginEmail ? generateTemporaryPassword() : null

    try {
      const patient = await prisma.patient.create({
        data: {
          name: input.name,
          age: input.age ?? null,
          phone: input.phone ?? null,
          address: input.address ?? null,
          notes: input.notes ?? null,
          pregnancyStart: input.pregnancyStart ?? null,
          expectedDelivery,
          // `connect` plutôt que la clé brute: Prisma interdit de mélanger un
          // identifiant de relation avec la création imbriquée du compte.
          ...(matroneId ? { matrone: { connect: { id: matroneId } } } : {}),
          ...(input.loginEmail && temporaryPassword
            ? {
                user: {
                  create: {
                    email: input.loginEmail.toLowerCase(),
                    name: input.name,
                    role: "patiente",
                    passwordHash: await hashPassword(temporaryPassword),
                    mustChangePassword: true,
                  },
                },
              }
            : {}),
        },
        include: patientListInclude(),
      })

      return ok({ patient: serializePatient(patient), temporaryPassword }, 201)
    } catch (err) {
      if (isUniqueViolation(err)) throw badRequest("Un compte existe déjà avec cet email")
      throw err
    }
  } catch (err) {
    return handleRouteError(err, "/api/patients POST")
  }
}
