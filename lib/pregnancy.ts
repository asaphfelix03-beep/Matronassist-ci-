const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
const GESTATION_DAYS = 280 // 40 semaines à partir du début de grossesse

/**
 * Nombre de semaines révolues depuis le début de grossesse, borné à [1, 42].
 * Retourne null si la date de début est absente ou dans le futur.
 */
export function pregnancyWeek(pregnancyStart: Date | string | null | undefined): number | null {
  if (!pregnancyStart) return null

  const start = new Date(pregnancyStart)
  if (Number.isNaN(start.getTime())) return null

  const elapsed = Date.now() - start.getTime()
  if (elapsed < 0) return null

  return Math.min(42, Math.max(1, Math.floor(elapsed / MS_PER_WEEK)))
}

/** Date d'accouchement estimée: début de grossesse + 280 jours. */
export function estimatedDelivery(pregnancyStart: Date | string | null | undefined): Date | null {
  if (!pregnancyStart) return null

  const start = new Date(pregnancyStart)
  if (Number.isNaN(start.getTime())) return null

  return new Date(start.getTime() + GESTATION_DAYS * 24 * 60 * 60 * 1000)
}

/** Formate une date ISO en JJ/MM/AAAA, ou "—" si absente. */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleDateString("fr-FR")
}
