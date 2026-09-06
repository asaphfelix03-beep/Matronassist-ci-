"use client"

import { useEffect } from "react"

/**
 * Enregistre le service worker qui rend l'application utilisable hors ligne.
 *
 * Volontairement limité au navigateur de production: en développement, un cache
 * persistant masquerait les modifications de code.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") return

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service worker non enregistré", err)
      })
    }

    // Après le chargement, pour ne pas concurrencer les requêtes initiales.
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])

  return null
}
