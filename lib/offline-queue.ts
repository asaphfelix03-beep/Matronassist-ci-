"use client"

/**
 * File d'attente des écritures effectuées hors connexion.
 *
 * Une matrone en zone mal couverte doit pouvoir saisir une consultation sans
 * réseau. Les requêtes d'écriture qui échouent faute de connexion sont donc
 * conservées dans IndexedDB, puis rejouées dans l'ordre au retour du réseau.
 *
 * Ne sont mises en file que les opérations rejouables sans ambiguïté: création
 * de consultation, de rendez-vous, d'entrée de journal, de relevé de mouvements
 * et envoi de message. Les opérations qui produisent un secret affiché une seule
 * fois (création de compte) ou qui dépendent de l'instant (appels) sont exclues:
 * les rejouer plus tard n'aurait pas de sens.
 */

const DB_NAME = "matronassist-offline"
const DB_VERSION = 1
const STORE = "pending"

export interface PendingWrite {
  id?: number
  path: string
  method: "POST" | "PATCH"
  body: string
  /** Libellé montré à l'utilisateur dans la liste des envois en attente. */
  label: string
  createdAt: string
}

/** Chemins dont l'écriture peut être différée sans changer de sens. */
const QUEUEABLE = [
  /^\/api\/patients\/[^/]+\/consultations$/,
  /^\/api\/patients\/[^/]+\/journal$/,
  /^\/api\/patients\/[^/]+\/movements$/,
  /^\/api\/patients\/[^/]+\/messages$/,
  /^\/api\/appointments$/,
]

export function isQueueable(path: string, method: string): boolean {
  if (method !== "POST") return false
  const pathname = path.split("?")[0]
  return QUEUEABLE.some((pattern) => pattern.test(pathname))
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = run(transaction.objectStore(STORE))

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => db.close()
      }),
  )
}

export async function enqueue(write: Omit<PendingWrite, "id">): Promise<void> {
  await transact("readwrite", (store) => store.add(write))
  notifyChange()
}

export async function listPending(): Promise<PendingWrite[]> {
  try {
    const all = await transact<PendingWrite[]>("readonly", (store) => store.getAll() as IDBRequest<PendingWrite[]>)
    return all.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
  } catch {
    return []
  }
}

async function remove(id: number): Promise<void> {
  await transact("readwrite", (store) => store.delete(id) as unknown as IDBRequest<undefined>)
}

/** Événement émis à chaque modification de la file, pour rafraîchir l'indicateur. */
const CHANGE_EVENT = "matronassist:queue-changed"

function notifyChange() {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

export function onQueueChange(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener)
  return () => window.removeEventListener(CHANGE_EVENT, listener)
}

export interface FlushResult {
  sent: number
  failed: number
  remaining: number
}

let isFlushing = false

/**
 * Rejoue les écritures en attente, dans l'ordre de saisie.
 *
 * Une entrée rejetée par le serveur (validation, droits) est retirée: la rejouer
 * indéfiniment bloquerait la file derrière elle. Une entrée qui échoue faute de
 * réseau reste en place et l'exécution s'arrête, pour préserver l'ordre.
 */
export async function flushQueue(): Promise<FlushResult> {
  if (isFlushing) return { sent: 0, failed: 0, remaining: (await listPending()).length }

  isFlushing = true
  let sent = 0
  let failed = 0

  try {
    for (const write of await listPending()) {
      try {
        const response = await fetch(write.path, {
          method: write.method,
          headers: { "Content-Type": "application/json" },
          body: write.body,
        })

        if (response.ok) {
          sent += 1
        } else {
          // Refus définitif du serveur: inutile de réessayer.
          failed += 1
        }

        if (write.id !== undefined) await remove(write.id)
      } catch {
        // Toujours hors ligne: on garde l'entrée et on préserve l'ordre.
        break
      }
    }
  } finally {
    isFlushing = false
    notifyChange()
  }

  return { sent, failed, remaining: (await listPending()).length }
}
