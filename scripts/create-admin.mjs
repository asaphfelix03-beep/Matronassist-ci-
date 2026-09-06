/**
 * Crée (ou réinitialise) un compte administrateur.
 *
 * C'est le seul point d'entrée du système: tous les autres comptes sont ensuite
 * créés depuis l'application. Aucune donnée de démonstration n'est insérée.
 *
 *   npm run create-admin -- --email admin@structure.ci --name "Nom Prénom"
 *
 * Le mot de passe peut être fourni via la variable d'environnement ADMIN_PASSWORD;
 * sinon un mot de passe provisoire est généré et affiché une seule fois.
 */
import { PrismaClient } from "@prisma/client"
import { randomInt, scrypt as scryptCallback } from "node:crypto"
import { promisify } from "node:util"
import { randomBytes } from "node:crypto"

const scrypt = promisify(scryptCallback)
const prisma = new PrismaClient()

const SCRYPT = { N: 16384, r: 8, p: 1 }
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz"
const DIGITS = "23456789"

async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, 64, SCRYPT)
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), derived.toString("base64")].join("$")
}

function generatePassword() {
  const pick = (alphabet) => alphabet[randomInt(alphabet.length)]
  const characters = [
    ...Array.from({ length: 10 }, () => pick(LETTERS)),
    ...Array.from({ length: 4 }, () => pick(DIGITS)),
  ]
  for (let i = characters.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[characters[i], characters[j]] = [characters[j], characters[i]]
  }
  return characters.join("")
}

/** Lit `--clé valeur` depuis la ligne de commande. */
function arg(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index !== -1 ? process.argv[index + 1] : undefined
}

async function main() {
  const email = (arg("email") ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase()
  const name = (arg("name") ?? process.env.ADMIN_NAME ?? "Administrateur").trim()

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Email manquant ou invalide.\nUsage: npm run create-admin -- --email admin@structure.ci --name \"Nom\"")
    process.exit(1)
  }

  const providedPassword = process.env.ADMIN_PASSWORD
  if (providedPassword && providedPassword.length < 10) {
    console.error("ADMIN_PASSWORD doit faire au moins 10 caractères.")
    process.exit(1)
  }

  const password = providedPassword ?? generatePassword()
  const passwordHash = await hashPassword(password)

  const existing = await prisma.user.findUnique({ where: { email } })

  const user = await prisma.user.upsert({
    where: { email },
    // Un compte existant voit son mot de passe réinitialisé; ses sessions sont coupées.
    update: { passwordHash, role: "admin", isActive: true, mustChangePassword: !providedPassword, name },
    create: { email, name, role: "admin", passwordHash, mustChangePassword: !providedPassword },
  })

  if (existing) {
    await prisma.session.deleteMany({ where: { userId: user.id } })
  }

  console.log("")
  console.log(existing ? "Compte administrateur réinitialisé." : "Compte administrateur créé.")
  console.log(`  Email        : ${user.email}`)
  if (!providedPassword) {
    console.log(`  Mot de passe : ${password}`)
    console.log("  (affiché une seule fois — à changer à la première connexion)")
  }
  console.log("")
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
