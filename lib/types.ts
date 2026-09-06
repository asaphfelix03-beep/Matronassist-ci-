export type UserRole = "admin" | "matrone" | "patiente"

export const USER_ROLES: UserRole[] = ["admin", "matrone", "patiente"]

/** Identité résolue depuis la session, partagée entre serveur et composants client. */
export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  mustChangePassword: boolean
  /** Renseigné pour le rôle `matrone`: identifiant de sa fiche métier. */
  matroneId: string | null
  /** Renseigné pour le rôle `patiente`: identifiant de son dossier. */
  patientId: string | null
}

export type PatientStatus = "stable" | "alert"

export type AppointmentStatus = "scheduled" | "completed" | "cancelled"

/** Compte matrone tel que présenté dans l'espace d'administration. */
export interface MatroneAccount {
  id: string
  userId: string
  name: string
  email: string
  region: string
  phone: string | null
  isActive: boolean
  lastLoginAt: string | null
  mustChangePassword: boolean
  patients: number
  createdAt: string
}

export interface Vitals {
  bloodPressure: string | null
  weight: string | null
  temperature: string | null
  heartRate: string | null
}

export interface Consultation extends Vitals {
  id: string
  patientId: string
  type: string
  date: string
  notes: string
  recordedByName: string | null
}

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  date: string
  time: string
  type: string
  status: AppointmentStatus
}

export interface PatientRecord {
  id: string
  name: string
  age: number | null
  phone: string | null
  address: string | null
  status: PatientStatus
  pregnancyStart: string | null
  expectedDelivery: string | null
  notes: string | null
  /** Semaines révolues depuis `pregnancyStart`; jamais stocké. */
  week: number | null
  matroneId: string | null
  matroneName: string | null
  /** Vrai si la patiente dispose d'un accès à l'application. */
  hasLogin: boolean
  email: string | null
  lastVisit: string | null
  nextAppointment: string | null
  /** Constantes de la consultation la plus récente. */
  vitals: Vitals | null
  createdAt: string
}

export interface PatientDetail extends PatientRecord {
  consultations: Consultation[]
  appointments: Appointment[]
}

export interface JournalEntry {
  id: string
  patientId: string
  date: string
  content: string
  /** Semaine de grossesse au moment de l'entrée. */
  week: number | null
}

export interface FetalMovement {
  id: string
  patientId: string
  recordedAt: string
  count: number
  notes: string | null
}

export interface Message {
  id: string
  patientId: string
  senderId: string
  senderName: string
  senderRole: UserRole
  body: string
  readAt: string | null
  createdAt: string
  /** Vrai si le message a été écrit par l'utilisateur courant. */
  mine: boolean
}

/** Fil de discussion vu par la matrone: une ligne par patiente. */
export interface Conversation {
  patientId: string
  patientName: string
  lastMessage: string | null
  lastMessageAt: string | null
  unread: number
}

export type CallStatus = "ringing" | "active" | "ended" | "declined" | "missed"

export type SignalKind = "offer" | "answer" | "candidate"

/**
 * Métadonnées d'un appel. Le média circule en pair-à-pair via WebRTC et ne
 * transite jamais par le serveur.
 */
export interface CallSession {
  id: string
  patientId: string
  patientName: string
  callerId: string
  callerName: string
  status: CallStatus
  withVideo: boolean
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  /** Vrai si l'utilisateur courant a passé l'appel (et non le reçoit). */
  isCaller: boolean
}

/** Message de négociation WebRTC échangé entre les deux pairs. */
export interface CallSignalMessage {
  id: string
  kind: SignalKind
  payload: string
  senderId: string
  createdAt: string
}

export type AlertSeverity = "error" | "warning"

/** Alerte calculée à partir de l'état réel des données, jamais stockée. */
export interface SystemAlert {
  id: string
  severity: AlertSeverity
  title: string
  detail: string
  patientId: string | null
}

export interface DashboardStats {
  totalMatrones: number
  activeMatrones: number
  totalPatients: number
  patientsUnderWatch: number
  upcomingAppointments: number
  consultationsThisMonth: number
}
