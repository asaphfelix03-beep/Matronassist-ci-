"use client"

/**
 * Dernier filet: une erreur survenue dans le layout racine empêche le rendu de
 * l'application entière, styles compris. Cette page doit donc fournir son propre
 * <html>/<body> et ne dépendre d'aucun composant.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#f2ece5",
          color: "#3a2f28",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            L'application n'a pas pu démarrer
          </h1>
          <p style={{ color: "#6b5c51", marginBottom: "1.5rem" }}>
            Un incident technique empêche l'affichage. Réessayez dans un instant.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#6b5c51", marginBottom: "1.5rem" }}>
              Référence : {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 600,
              color: "#ffffff",
              background: "#2f7d7a",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
