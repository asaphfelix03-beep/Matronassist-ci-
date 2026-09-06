import "server-only"

import type { Prisma } from "@prisma/client"

import { forbidden, notFound } from "./api-auth"
import { prisma } from "./prisma"
import type { SessionUser } from "./session"

/** Ne correspond à aucune ligne: utilisé quand un rôle n'a aucun périmètre valide. */
const MATCHES_NOTHING: Prisma.PatientWhereInput = { id: { in: [] } }

/**
 * Filtre restreignant les dossiers visibles par l'utilisateur.
 * - admin: tout le réseau
 * - matrone: uniquement les patientes qui lui sont rattachées
 * - patiente: uniquement son propre dossier
 */
export function patientScope(user: SessionUser): Prisma.PatientWhereInput {
  switch (user.role) {
    case "admin":
      return {}
    case "matrone":
      return user.matroneId ? { matroneId: user.matroneId } : MATCHES_NOTHING
    case "patiente":
      return user.patientId ? { id: user.patientId } : MATCHES_NOTHING
    default:
      return MATCHES_NOTHING
  }
}

/**
 * Charge un dossier en appliquant le périmètre de l'utilisateur.
 * Renvoie 404 — et non 403 — quand le dossier existe mais est hors périmètre,
 * pour ne pas révéler l'existence de dossiers d'autres matrones.
 */
export async function requirePatient<T extends Prisma.PatientInclude>(
  user: SessionUser,
  patientId: string,
  include?: T,
) {
  const patient = await prisma.patient.findFirst({
    where: { AND: [{ id: patientId }, patientScope(user)] },
    include,
  })

  if (!patient) throw notFound("Patiente")

  return patient as Prisma.PatientGetPayload<{ include: T }>
}

/** Seules matrones et administrateurs modifient un dossier médical. */
export function requireCaregiver(user: SessionUser): void {
  if (user.role !== "matrone" && user.role !== "admin") throw forbidden()
}

/** Le journal et les mouvements fœtaux sont saisis par la patiente elle-même. */
export function requireOwnRecord(user: SessionUser, patientId: string): void {
  if (user.role === "patiente" && user.patientId !== patientId) throw forbidden()
}
