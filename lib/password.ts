import {
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto"
import { promisify } from "node:util"

// `promisify` retient la surcharge sans options: on réexpose celle qui les accepte.
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>

/**
 * scrypt est fourni par Node, ce qui évite une dépendance native pour le hachage.
 * N = 2^14 correspond à ~16 Mo de mémoire par calcul, un compromis usuel entre
 * coût pour un attaquant et latence de connexion.
 */
const SCRYPT = { N: 16384, r: 8, p: 1 }
const KEY_LENGTH = 64
const SALT_LENGTH = 16

export { checkPasswordPolicy, PASSWORD_MIN_LENGTH } from "./password-policy"

/** Encodage autonome: `scrypt$N$r$p$sel$empreinte`, tout en base64. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const derived = (await scrypt(password, salt, KEY_LENGTH, SCRYPT)) as Buffer

  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), derived.toString("base64")].join("$")
}

/** Comparaison à temps constant; retourne false sur toute empreinte malformée. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$")
  if (parts.length !== 6 || parts[0] !== "scrypt") return false

  const [, n, r, p, saltB64, hashB64] = parts
  const salt = Buffer.from(saltB64, "base64")
  const expected = Buffer.from(hashB64, "base64")
  if (salt.length === 0 || expected.length === 0) return false

  try {
    const derived = (await scrypt(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })) as Buffer

    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

// Alphabets sans caractères ambigus (0/O, 1/l/I), pour une transmission orale.
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz"
const DIGITS = "23456789"

const pick = (alphabet: string) => alphabet[randomInt(alphabet.length)]

/**
 * Mot de passe provisoire remis à l'utilisateur à la création de son compte.
 * Composé pour satisfaire `checkPasswordPolicy` par construction.
 */
export function generateTemporaryPassword(): string {
  const characters = [
    ...Array.from({ length: 10 }, () => pick(LETTERS)),
    ...Array.from({ length: 4 }, () => pick(DIGITS)),
  ]

  // Mélange de Fisher-Yates pour ne pas exposer la position des chiffres.
  for (let i = characters.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[characters[i], characters[j]] = [characters[j], characters[i]]
  }

  return characters.join("")
}
