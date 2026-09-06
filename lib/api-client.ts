import type {
  Appointment,
  CallSession,
  CallSignalMessage,
  Consultation,
  Conversation,
  DashboardStats,
  FetalMovement,
  JournalEntry,
  MatroneAccount,
  Message,
  PatientDetail,
  PatientRecord,
  SignalKind,
  SystemAlert,
} from "./types"

import { enqueue, isQueueable } from "./offline-queue"

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

/** Erreur porteuse du code HTTP, pour distinguer une session expirée du reste. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * L'écriture n'a pas pu partir faute de réseau, mais elle est conservée et sera
 * rejouée. Ce n'est pas un échec: l'interface doit le dire à l'utilisateur.
 */
export class OfflineQueuedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "OfflineQueuedError"
  }
}

/** Libellé lisible d'une écriture différée, pour la liste des envois en attente. */
function describeWrite(path: string): string {
  if (path.includes("/consultations")) return "Consultation"
  if (path.includes("/journal")) return "Entrée de journal"
  if (path.includes("/movements")) return "Relevé de mouvements"
  if (path.includes("/messages")) return "Message"
  if (path.includes("/appointments")) return "Rendez-vous"
  return "Enregistrement"
}

/** Traduit une erreur d'écriture en notification adaptée. */
export function describeWriteError(err: unknown, failureTitle: string): { title: string; description: string } {
  if (err instanceof OfflineQueuedError) {
    return { title: "Enregistré hors ligne", description: err.message }
  }
  return { title: failureTitle, description: err instanceof Error ? err.message : String(err) }
}

function describe(payload: ApiEnvelope<unknown> | null, fallback: string): string {
  const fieldErrors = Object.values(payload?.errors ?? {})
    .flat()
    .filter(Boolean)

  if (fieldErrors.length > 0) return fieldErrors.join(" · ")
  return payload?.message ?? fallback
}

/**
 * Appelle une route interne `/api/...`.
 * Le cookie de session est envoyé automatiquement (même origine).
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase()

  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    })
  } catch {
    // Réseau indisponible: on met de côté ce qui peut être rejoué tel quel.
    if (typeof window !== "undefined" && typeof init?.body === "string" && isQueueable(path, method)) {
      await enqueue({
        path,
        method: "POST",
        body: init.body,
        label: describeWrite(path),
        createdAt: new Date().toISOString(),
      })
      throw new OfflineQueuedError("Votre saisie partira automatiquement dès le retour du réseau.")
    }

    throw new ApiError(0, "Connexion au serveur impossible")
  }

  const text = await response.text()
  let payload: ApiEnvelope<T> | null = null
  try {
    payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null
  } catch {
    payload = null
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(response.status, describe(payload, `Erreur serveur (${response.status})`))
  }

  return payload.data as T
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) })

const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) })

// --- Authentification -------------------------------------------------------

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: string
  mustChangePassword: boolean
}

export const login = (email: string, password: string) =>
  post<AuthenticatedUser>("/api/auth/login", { email, password })

export const logout = () => post<{ loggedOut: boolean }>("/api/auth/logout")

export const changePassword = (currentPassword: string, newPassword: string) =>
  post<{ passwordChanged: boolean }>("/api/auth/password", { currentPassword, newPassword })

// --- Matrones (admin) -------------------------------------------------------

export interface MatroneInput {
  name: string
  email: string
  region: string
  phone?: string | null
}

export const fetchMatrones = () => request<MatroneAccount[]>("/api/matrones")

export const createMatrone = (input: MatroneInput) =>
  post<{ matrone: MatroneAccount; temporaryPassword: string }>("/api/matrones", input)

export const updateMatrone = (id: string, input: Partial<MatroneInput & { isActive: boolean }>) =>
  patch<MatroneAccount>(`/api/matrones/${id}`, input)

export const resetMatronePassword = (id: string) =>
  post<{ temporaryPassword: string }>(`/api/matrones/${id}/password`)

export const deleteMatrone = (id: string) =>
  request<{ deleted: boolean }>(`/api/matrones/${id}`, { method: "DELETE" })

// --- Patientes --------------------------------------------------------------

export interface PatientInput {
  name: string
  age?: string | number | null
  phone?: string | null
  address?: string | null
  pregnancyStart?: string | null
  expectedDelivery?: string | null
  notes?: string | null
  matroneId?: string | null
  loginEmail?: string | null
}

export const fetchPatients = () => request<PatientRecord[]>("/api/patients")

export const fetchPatient = (id: string) => request<PatientDetail>(`/api/patients/${id}`)

export const createPatient = (input: PatientInput) =>
  post<{ patient: PatientRecord; temporaryPassword: string | null }>("/api/patients", input)

export const updatePatient = (id: string, input: Partial<PatientInput>) =>
  patch<PatientDetail>(`/api/patients/${id}`, input)

export const deletePatient = (id: string) =>
  request<{ deleted: boolean }>(`/api/patients/${id}`, { method: "DELETE" })

// --- Consultations et rendez-vous -------------------------------------------

export interface ConsultationInput {
  type: string
  date: string
  notes: string
  bloodPressure?: string | null
  weight?: string | null
  temperature?: string | null
  heartRate?: string | null
}

export const createConsultation = (patientId: string, input: ConsultationInput) =>
  post<{ consultation: Consultation; patientStatus: string }>(`/api/patients/${patientId}/consultations`, input)

export interface AppointmentInput {
  patientId: string
  date: string
  time: string
  type: string
}

export const fetchAppointments = () => request<Appointment[]>("/api/appointments")

export const createAppointment = (input: AppointmentInput) => post<Appointment>("/api/appointments", input)

// --- Espace patiente --------------------------------------------------------

export const fetchJournal = (patientId: string) => request<JournalEntry[]>(`/api/patients/${patientId}/journal`)

export const createJournalEntry = (patientId: string, content: string) =>
  post<JournalEntry>(`/api/patients/${patientId}/journal`, { content })

export const fetchMovements = (patientId: string) =>
  request<FetalMovement[]>(`/api/patients/${patientId}/movements`)

export const createMovement = (patientId: string, count: number, notes?: string | null) =>
  post<FetalMovement>(`/api/patients/${patientId}/movements`, { count, notes })

// --- Messagerie -------------------------------------------------------------

export const fetchConversations = () => request<Conversation[]>("/api/conversations")

/** `since` limite la réponse aux messages postérieurs, pour un rafraîchissement continu. */
export const fetchMessages = (patientId: string, since?: string | null) =>
  request<Message[]>(
    `/api/patients/${patientId}/messages${since ? `?since=${encodeURIComponent(since)}` : ""}`,
  )

export const sendMessage = (patientId: string, body: string) =>
  post<Message>(`/api/patients/${patientId}/messages`, { body })

// --- Appels (WebRTC) --------------------------------------------------------

export const startCall = (patientId: string, withVideo: boolean) =>
  post<CallSession>(`/api/patients/${patientId}/calls`, { withVideo })

export const fetchIncomingCall = () => request<CallSession | null>("/api/calls/incoming")

export const fetchCall = (callId: string) => request<CallSession>(`/api/calls/${callId}`)

export const answerCall = (callId: string, action: "accept" | "decline" | "end") =>
  patch<CallSession>(`/api/calls/${callId}`, { action })

export const fetchSignals = (callId: string, since?: string | null) =>
  request<CallSignalMessage[]>(
    `/api/calls/${callId}/signals${since ? `?since=${encodeURIComponent(since)}` : ""}`,
  )

export const sendSignal = (callId: string, kind: SignalKind, payload: string) =>
  post<CallSignalMessage>(`/api/calls/${callId}/signals`, { kind, payload })

export const fetchCallHistory = (patientId: string) =>
  request<CallSession[]>(`/api/patients/${patientId}/calls`)

// --- Tableaux de bord -------------------------------------------------------

export const fetchStats = () => request<DashboardStats>("/api/stats")

export const fetchAlerts = () => request<SystemAlert[]>("/api/alerts")
