import "server-only"

import { forbidden, notFound } from "./api-auth"
import { patientScope } from "./access"
import { prisma } from "./prisma"
import type { SessionUser } from "./types"

/** Un appel non décroché passe en « manqué » au-delà de ce délai. */
export const RING_TIMEOUT_MS = 45_000

/**
 * Un appel n'engage que la patiente et sa matrone référente.
 * L'administration a beau voir les dossiers, elle ne rejoint pas les appels:
 * une communication médicale n'a pas à être accessible à un tiers.
 */
export async function requireCallParticipant(user: SessionUser, patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: { AND: [{ id: patientId }, patientScope(user)] },
    select: { id: true, name: true, userId: true, matroneId: true, matrone: { select: { userId: true } } },
  })

  if (!patient) throw notFound("Patiente")

  const isThePatient = user.role === "patiente" && user.patientId === patient.id
  const isHerMatrone = user.role === "matrone" && user.matroneId !== null && patient.matroneId === user.matroneId

  if (!isThePatient && !isHerMatrone) throw forbidden()

  return patient
}

/**
 * Bascule en « manqué » les appels qui sonnent depuis trop longtemps.
 * Fait paresseusement à chaque lecture: pas de tâche planifiée à maintenir.
 */
export async function expireStaleCalls(): Promise<void> {
  await prisma.call.updateMany({
    where: { status: "ringing", createdAt: { lt: new Date(Date.now() - RING_TIMEOUT_MS) } },
    data: { status: "missed", endedAt: new Date() },
  })
}
