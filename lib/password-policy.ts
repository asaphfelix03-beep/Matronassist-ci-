/**
 * Politique de mot de passe, isolée du hachage: ce module ne dépend pas de
 * `node:crypto` et peut donc être importé par les composants client.
 */

export const PASSWORD_MIN_LENGTH = 10

/** Retourne le motif d'échec de la politique, ou null si le mot de passe est valide. */
export function checkPasswordPolicy(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères`
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre et un chiffre"
  }
  return null
}
