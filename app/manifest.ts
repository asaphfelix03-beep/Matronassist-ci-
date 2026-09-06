import type { MetadataRoute } from "next"

/**
 * Manifeste d'installation. Généré ici plutôt que servi en statique, pour rester
 * cohérent avec les couleurs déclarées dans le layout.
 *
 * L'icône SVG avec `sizes: "any"` suffit à rendre l'application installable sur
 * Android; un jeu de PNG 192/512 dessinés par un graphiste reste préférable pour
 * maîtriser le rendu sur l'écran d'accueil.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Matronassist-ci",
    short_name: "Matronassist",
    description: "Suivi périnatal simple et accessible pour la Côte d'Ivoire.",
    lang: "fr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2ece5",
    theme_color: "#2f7d7a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  }
}
