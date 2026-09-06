import { NextResponse } from "next/server"
import { z } from "zod"

/** Les formulaires HTML envoient "" pour un champ vide: on le traite comme absent. */
const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value)

export const optionalText = z.preprocess(blankToNull, z.string().trim().nullish())
export const optionalDate = z.preprocess(blankToNull, z.coerce.date().nullish())
export const optionalInt = z.preprocess(blankToNull, z.coerce.number().int().nullish())

export function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status })
}

export function validationError(error: z.ZodError) {
  return NextResponse.json(
    { success: false, message: "Données invalides", errors: error.flatten().fieldErrors },
    { status: 400 },
  )
}

/** Parse le corps JSON d'une requête, en renvoyant null si le corps est absent ou illisible. */
export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
