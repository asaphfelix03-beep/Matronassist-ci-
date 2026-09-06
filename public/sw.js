/*
 * Service worker de Matronassist-ci.
 *
 * Écrit à la main plutôt que généré: le comportement attendu est simple et
 * explicite, et une application de santé gagne à ce que sa politique de cache
 * soit lisible.
 *
 * Stratégies:
 *   - Ressources de build (/_next/static/…): immuables, servies depuis le cache.
 *   - Navigations: réseau d'abord, repli sur la page hors-ligne si indisponible.
 *   - Lectures d'API (GET /api/…): réseau d'abord, repli sur la dernière réponse
 *     connue, marquée d'un en-tête pour que l'interface signale une donnée datée.
 *   - Écritures (POST/PATCH/DELETE): jamais mises en cache. Elles sont mises en
 *     file d'attente par l'application elle-même (voir lib/offline-queue.ts),
 *     qui seule connaît le sens métier de chaque requête.
 */

const VERSION = "v1"
const SHELL_CACHE = `shell-${VERSION}`
const DATA_CACHE = `data-${VERSION}`
const OFFLINE_URL = "/offline"

/** En-tête ajouté aux réponses servies depuis le cache. */
const STALE_HEADER = "x-matronassist-stale"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon.svg"]))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.endsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

/** Réponse issue du cache, marquée comme potentiellement datée. */
function markStale(response) {
  const headers = new Headers(response.headers)
  headers.set(STALE_HEADER, "1")
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

async function handleNavigation(request) {
  try {
    return await fetch(request)
  } catch {
    const cache = await caches.open(SHELL_CACHE)
    return (await cache.match(OFFLINE_URL)) ?? Response.error()
  }
}

async function handleApiRead(request) {
  const cache = await caches.open(DATA_CACHE)

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return markStale(cached)

    return new Response(
      JSON.stringify({ success: false, message: "Hors ligne : cette donnée n'est pas disponible." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    )
  }
}

async function handleStatic(request) {
  const cache = await caches.open(SHELL_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Le service worker ne s'occupe que de sa propre origine.
  if (url.origin !== self.location.origin) return

  // Les écritures et la signalisation d'appel doivent toujours toucher le réseau.
  if (request.method !== "GET") return

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request))
    return
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(handleStatic(request))
    return
  }

  if (url.pathname.startsWith("/api/")) {
    // Les sondages temps réel n'ont aucun intérêt en différé.
    const isRealtime =
      url.pathname.startsWith("/api/calls/") ||
      url.pathname === "/api/calls/incoming" ||
      url.searchParams.has("since")

    if (!isRealtime) event.respondWith(handleApiRead(request))
  }
})
