import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { cookies } from "next/headers"

import { prisma } from "./prisma"
import type { SessionUser, UserRole } from "./types"

export type { SessionUser }

export const SESSION_COOKIE = "matronassist_session"

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** Seule l'empreinte du jeton est stockée: la base ne permet pas de rejouer une session. */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

function toSessionUser(user: {
  id: string
  email: string
  name: string
  role: string
  mustChangePassword: boolean
  matrone: { id: string } | null
  patient: { id: string } | null
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    mustChangePassword: user.mustChangePassword,
    matroneId: user.matrone?.id ?? null,
    patientId: user.patient?.id ?? null,
  }
}

/** Ouvre une session et pose le cookie httpOnly correspondant. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  })
}

/** Ferme la session courante côté base et côté navigateur. */
export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value

  if (token) {
    // deleteMany plutôt que delete: ne lève pas si la session a déjà expiré.
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  }

  store.delete(SESSION_COOKIE)
}

/** Invalide toutes les sessions d'un compte (désactivation, changement de mot de passe). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } })
}

/**
 * Résout l'utilisateur de la requête courante, ou null.
 * Un compte désactivé est traité comme non connecté.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { matrone: { select: { id: true } }, patient: { select: { id: true } } } } },
  })

  if (!session) return null

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  if (!session.user.isActive) return null

  return toSessionUser(session.user)
}
