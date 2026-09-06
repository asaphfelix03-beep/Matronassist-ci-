import type { Vitals } from "./types"

/**
 * Seuils de vigilance du suivi prénatal: HTA gravidique (≥ 140/90), fièvre (≥ 38 °C)
 * et tachycardie (≥ 110 bpm). Ils servent uniquement à faire remonter une fiche en
 * « surveillance » dans l'interface — ils ne remplacent pas un avis médical.
 */
const SYSTOLIC_ALERT = 140
const DIASTOLIC_ALERT = 90
const TEMPERATURE_ALERT = 38
const HEART_RATE_ALERT = 110

/** Extrait la première valeur numérique d'une saisie libre ("36,8 °C" -> 36.8). */
function parseNumber(value: string | null | undefined): number | null {
  if (!value) return null

  const match = value.replace(",", ".").match(/-?\d+(\.\d+)?/)
  if (!match) return null

  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

/** Découpe une tension "120/80" en systolique / diastolique. */
export function parseBloodPressure(value: string | null | undefined): { systolic: number | null; diastolic: number | null } {
  if (!value) return { systolic: null, diastolic: null }

  const [systolic, diastolic] = value.split("/")
  return { systolic: parseNumber(systolic), diastolic: parseNumber(diastolic) }
}

/** Vrai si au moins une constante dépasse un seuil de vigilance. */
export function isVitalsAlerting(vitals: Partial<Vitals>): boolean {
  const { systolic, diastolic } = parseBloodPressure(vitals.bloodPressure)
  const temperature = parseNumber(vitals.temperature)
  const heartRate = parseNumber(vitals.heartRate)

  return (
    (systolic !== null && systolic >= SYSTOLIC_ALERT) ||
    (diastolic !== null && diastolic >= DIASTOLIC_ALERT) ||
    (temperature !== null && temperature >= TEMPERATURE_ALERT) ||
    (heartRate !== null && heartRate >= HEART_RATE_ALERT)
  )
}
