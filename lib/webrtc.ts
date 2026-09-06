/**
 * Configuration WebRTC.
 *
 * Seuls des serveurs STUN publics sont déclarés: ils permettent à chaque pair de
 * découvrir son adresse publique, ce qui suffit dans la grande majorité des cas.
 *
 * ⚠️ Sans serveur TURN, les appels échouent derrière certains réseaux d'entreprise
 * ou NAT symétriques (ordre de grandeur usuel: 10 à 20 % des cas). Pour une
 * fiabilité complète, ajoutez un TURN via les variables d'environnement
 * NEXT_PUBLIC_TURN_URL / NEXT_PUBLIC_TURN_USERNAME / NEXT_PUBLIC_TURN_CREDENTIAL.
 */
const STUN_SERVERS = ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]

export function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: STUN_SERVERS }]

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    })
  }

  return servers
}

/** Vrai si le navigateur expose les API nécessaires à un appel. */
export function supportsCalls(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.RTCPeerConnection === "function" &&
    typeof navigator?.mediaDevices?.getUserMedia === "function"
  )
}

/** Message d'erreur lisible pour les refus d'accès au micro ou à la caméra. */
export function describeMediaError(err: unknown): string {
  const name = (err as { name?: string })?.name

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Accès au micro refusé. Autorisez-le dans votre navigateur puis réessayez."
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "Aucun micro détecté sur cet appareil."
    case "NotReadableError":
      return "Le micro est déjà utilisé par une autre application."
    default:
      return err instanceof Error ? err.message : "Impossible d'accéder au micro"
  }
}
