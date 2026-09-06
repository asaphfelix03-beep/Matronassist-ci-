import "server-only"

import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { getSessionUser, type SessionUser } from "./session"
import type { UserRole } from "./types"

/** Erreur portant le code HTTP à renvoyer au client. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "HttpError"
  }
}

export const unauthorized = () => new HttpError(401, "Authentification requise")
export const forbidden = () => new HttpError(403, "Accès refusé")
export const notFound = (what = "Ressource") => new HttpError(404, `${what} introuvable`)
export const badRequest = (message: string) => new HttpError(400, message)

/**
 * Exige une session valide, et optionnellement l'un des rôles indiqués.
 * À appeler en première ligne de chaque route: c'est le seul point de contrôle,
 * il n'existe pas de middleware d'authentification (Prisma ne tourne pas en edge).
 */
export async function requireUser(roles?: UserRole[]): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw unauthorized()

  if (roles && !roles.includes(user.role)) throw forbidden()

  return user
}

/**
 * Traduit une erreur de route en réponse JSON.
 * Les erreurs inattendues sont journalisées et renvoyées en 500 sans détail,
 * pour ne pas exposer la structure interne au client.
 */
export function handleRouteError(err: unknown, route: string): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ success: false, message: err.message }, { status: err.status })
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      { success: false, message: "Données invalides", errors: err.flatten().fieldErrors },
      { status: 400 },
    )
  }

  console.error(`${route} error`, err)
  return NextResponse.json({ success: false, message: "Erreur interne du serveur" }, { status: 500 })
}

/** Réponse de succès uniforme. */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}
