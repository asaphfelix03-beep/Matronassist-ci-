export type UserRole = "admin" | "matrone" | "patiente"

export type MatroneStatus = "active" | "inactive"

export interface MatroneAccount {
  id: string
  name: string
  region: string
  email?: string
  phone?: string
  patients: number
  status: MatroneStatus
  lastActive: string
  createdAt: string
}

export interface SystemAlert {
  id: string
  type: "error" | "warning"
  message: string
  time: string
}

export interface StatsSummary {
  totalMatrones: number
  totalPatients: number
  pendingAppointments: number
  activeAlerts: number
  systemHealth: string
}
