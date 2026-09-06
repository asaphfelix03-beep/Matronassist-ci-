import type {
  Appointment as AppointmentRow,
  Call as CallRow,
  CallSignal as CallSignalRow,
  Consultation as ConsultationRow,
  FetalMovement as FetalMovementRow,
  JournalEntry as JournalEntryRow,
  Matrone as MatroneRow,
  Message as MessageRow,
  Patient as PatientRow,
  User as UserRow,
} from "@prisma/client"

import { pregnancyWeek } from "./pregnancy"
import type {
  Appointment,
  AppointmentStatus,
  CallSession,
  CallSignalMessage,
  CallStatus,
  Consultation,
  FetalMovement,
  JournalEntry,
  MatroneAccount,
  Message,
  PatientDetail,
  PatientRecord,
  PatientStatus,
  SignalKind,
  UserRole,
} from "./types"

type MatroneWithUser = MatroneRow & {
  user: UserRow
  _count?: { patients: number }
}

export type PatientWithRelations = PatientRow & {
  user?: Pick<UserRow, "email"> | null
  matrone?: (MatroneRow & { user: Pick<UserRow, "name"> }) | null
  consultations?: (ConsultationRow & { recordedBy?: Pick<UserRow, "name"> | null })[]
  appointments?: AppointmentRow[]
}

/** Le nombre de patientes est dérivé de la relation, jamais dénormalisé. */
export function serializeMatrone(row: MatroneWithUser): MatroneAccount {
  return {
    id: row.id,
    userId: row.userId,
    name: row.user.name,
    email: row.user.email,
    region: row.region,
    phone: row.phone,
    isActive: row.user.isActive,
    lastLoginAt: row.user.lastLoginAt?.toISOString() ?? null,
    mustChangePassword: row.user.mustChangePassword,
    patients: row._count?.patients ?? 0,
    createdAt: row.createdAt.toISOString(),
  }
}

export function serializeConsultation(
  row: ConsultationRow & { recordedBy?: Pick<UserRow, "name"> | null },
): Consultation {
  return {
    id: row.id,
    patientId: row.patientId,
    type: row.type,
    date: row.date.toISOString(),
    notes: row.notes,
    bloodPressure: row.bloodPressure,
    weight: row.weight,
    temperature: row.temperature,
    heartRate: row.heartRate,
    recordedByName: row.recordedBy?.name ?? null,
  }
}

export function serializeAppointment(row: AppointmentRow, patientName: string): Appointment {
  return {
    id: row.id,
    patientId: row.patientId,
    patientName,
    date: row.date.toISOString(),
    time: row.time,
    type: row.type,
    status: row.status as AppointmentStatus,
  }
}

export function serializeCall(
  row: CallRow & { patient: Pick<PatientRow, "name">; caller: Pick<UserRow, "name"> },
  currentUserId: string,
): CallSession {
  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patient.name,
    callerId: row.callerId,
    callerName: row.caller.name,
    status: row.status as CallStatus,
    withVideo: row.withVideo,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    isCaller: row.callerId === currentUserId,
  }
}

export function serializeCallSignal(row: CallSignalRow): CallSignalMessage {
  return {
    id: row.id,
    kind: row.kind as SignalKind,
    payload: row.payload,
    senderId: row.senderId,
    createdAt: row.createdAt.toISOString(),
  }
}

export function serializeJournalEntry(row: JournalEntryRow, pregnancyStart: Date | null): JournalEntry {
  return {
    id: row.id,
    patientId: row.patientId,
    date: row.date.toISOString(),
    content: row.content,
    week: pregnancyStart ? weekAt(pregnancyStart, row.date) : null,
  }
}

export function serializeFetalMovement(row: FetalMovementRow): FetalMovement {
  return {
    id: row.id,
    patientId: row.patientId,
    recordedAt: row.recordedAt.toISOString(),
    count: row.count,
    notes: row.notes,
  }
}

export function serializeMessage(
  row: MessageRow & { sender: Pick<UserRow, "id" | "name" | "role"> },
  currentUserId: string,
): Message {
  return {
    id: row.id,
    patientId: row.patientId,
    senderId: row.senderId,
    senderName: row.sender.name,
    senderRole: row.sender.role as UserRole,
    body: row.body,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    mine: row.senderId === currentUserId,
  }
}

/**
 * Relations attendues par `serializePatient`. Recalculé à chaque appel car le
 * filtre des rendez-vous dépend de l'instant courant.
 */
export function patientListInclude() {
  return {
    user: { select: { email: true } },
    matrone: { include: { user: { select: { name: true } } } },
    consultations: { orderBy: { date: "desc" }, take: 1 },
    appointments: {
      where: { status: "scheduled", date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 1,
    },
  } as const
}

/** Historique complet, consultations du plus récent au plus ancien. */
export function patientDetailInclude() {
  return {
    user: { select: { email: true } },
    matrone: { include: { user: { select: { name: true } } } },
    consultations: { orderBy: { date: "desc" }, include: { recordedBy: { select: { name: true } } } },
    appointments: { orderBy: { date: "asc" } },
  } as const
}

/**
 * Vue liste d'un dossier. `consultations` doit être trié du plus récent au plus
 * ancien et `appointments` du plus proche au plus lointain — l'ordre détermine
 * `lastVisit`, `vitals` et `nextAppointment`.
 */
export function serializePatient(row: PatientWithRelations): PatientRecord {
  const latest = (row.consultations ?? [])[0]
  const now = Date.now()
  const upcoming = (row.appointments ?? []).find(
    (appointment) => appointment.status === "scheduled" && appointment.date.getTime() >= now,
  )

  return {
    id: row.id,
    name: row.name,
    age: row.age,
    phone: row.phone,
    address: row.address,
    status: row.status === "alert" ? "alert" : ("stable" as PatientStatus),
    pregnancyStart: row.pregnancyStart?.toISOString() ?? null,
    expectedDelivery: row.expectedDelivery?.toISOString() ?? null,
    notes: row.notes,
    week: pregnancyWeek(row.pregnancyStart),
    matroneId: row.matroneId,
    matroneName: row.matrone?.user.name ?? null,
    hasLogin: row.userId !== null,
    email: row.user?.email ?? null,
    lastVisit: latest?.date.toISOString() ?? null,
    nextAppointment: upcoming?.date.toISOString() ?? null,
    vitals: latest
      ? {
          bloodPressure: latest.bloodPressure,
          weight: latest.weight,
          temperature: latest.temperature,
          heartRate: latest.heartRate,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
  }
}

export function serializePatientDetail(row: PatientWithRelations): PatientDetail {
  return {
    ...serializePatient(row),
    consultations: (row.consultations ?? []).map(serializeConsultation),
    appointments: (row.appointments ?? []).map((appointment) => serializeAppointment(appointment, row.name)),
  }
}

/** Semaine de grossesse à une date passée, pour dater les entrées de journal. */
function weekAt(pregnancyStart: Date, at: Date): number | null {
  const elapsed = at.getTime() - pregnancyStart.getTime()
  if (elapsed < 0) return null

  return Math.min(42, Math.max(1, Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000))))
}
