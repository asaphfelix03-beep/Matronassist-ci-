/**
 * Sons d'alerte synthétisés dans le navigateur.
 *
 * Aucun fichier audio n'est chargé: le son reste disponible hors ligne et
 * n'ajoute rien au poids de l'application, ce qui compte sur réseau mobile.
 */

let context: AudioContext | null = null

/** Le contexte audio n'est créé qu'au premier son, après une interaction. */
function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null

  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null

  if (!context) context = new Ctor()
  // Les navigateurs suspendent le contexte tant que l'utilisateur n'a pas
  // interagi avec la page; une reprise suffit ensuite.
  if (context.state === "suspended") void context.resume()

  return context
}

/** Joue une note brève. `at` est un décalage en secondes depuis maintenant. */
function tone(ctx: AudioContext, frequency: number, at: number, duration: number, volume: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  const start = ctx.currentTime + at

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(frequency, start)

  // Enveloppe douce: une note carrée produit un clic désagréable.
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

/** Deux notes montantes: un message vient d'arriver. */
export function chime(): void {
  const ctx = audioContext()
  if (!ctx) return

  try {
    tone(ctx, 880, 0, 0.14, 0.16)
    tone(ctx, 1318.5, 0.12, 0.2, 0.13)
  } catch {
    // Le son n'est qu'un confort: son échec ne doit jamais remonter.
  }
}

/** Sonnerie d'appel entrant: deux notes répétées, plus insistantes. */
export function ring(): void {
  const ctx = audioContext()
  if (!ctx) return

  try {
    for (let repeat = 0; repeat < 2; repeat += 1) {
      const offset = repeat * 0.9
      tone(ctx, 660, offset, 0.35, 0.2)
      tone(ctx, 880, offset + 0.38, 0.35, 0.2)
    }
  } catch {
    // Idem: l'appel reste visible à l'écran même sans son.
  }
}
