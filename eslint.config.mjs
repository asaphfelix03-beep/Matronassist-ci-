import coreWebVitals from "eslint-config-next/core-web-vitals"
import typescript from "eslint-config-next/typescript"

/**
 * Configuration ESLint (flat config) alignée sur les règles Next.js.
 *
 * Deux règles sont ajustées pour ce projet:
 * - `react/no-unescaped-entities` est désactivée: l'interface est en français,
 *   les apostrophes sont omniprésentes et React les rend correctement.
 * - `react-hooks/set-state-in-effect` passe en avertissement: le chargement des
 *   données au montage suit ce motif dans tous les tableaux de bord. Le signal
 *   reste visible sans bloquer la vérification.
 */
const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/sw.js"] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]

export default config
