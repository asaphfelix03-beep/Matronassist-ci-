export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

// Type definitions for API responses
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

// API Service class for future Laravel backend integration
export class ApiService {
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      }

      // Ensure relative API calls go to Next.js internal API by default
      const url = endpoint.startsWith("/") ? `${API_BASE_URL}${endpoint}` : endpoint

      if (process.env.NEXT_PUBLIC_API_TOKEN) {
        headers.Authorization = "Bearer " + process.env.NEXT_PUBLIC_API_TOKEN
      }

      const response = await fetch(url, {
        ...options,
        headers,
      })

      // for non-OK responses try to parse JSON
      const text = await response.text()
      try {
        const parsed = text ? JSON.parse(text) : { success: false, message: 'Empty response' }
        return parsed as ApiResponse<T>
      } catch {
        return { success: false, message: 'Invalid JSON from API' }
      }
    } catch (error) {
      console.error("[v0] API request failed:", error)
      return {
        success: false,
        message: "Une erreur est survenue",
      }
    }
  }

  // Auth endpoints
  static async login(email: string, password: string, role: string) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    })
  }

  static async logout() {
    return this.request("/auth/logout", { method: "POST" })
  }

  // Matrone endpoints
  static async getMatrones() {
    return this.request("/matrones", { method: "GET" })
  }

  static async createMatrone(data: any) {
    return this.request("/matrones", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  static async updateMatroneStatus(id: string, status: string) {
    return this.request(`/matrones/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
  }

  // Patient endpoints
  static async getPatients() {
    return this.request("/patients", { method: "GET" })
  }

  static async createPatient(data: any) {
    return this.request("/patients", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  static async getPatientDetails(id: string) {
    return this.request(`/patients/${id}`, { method: "GET" })
  }

  static async updatePatient(id: string, data: any) {
    return this.request(`/patients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  // Consultation endpoints
  static async createConsultation(patientId: string, data: any) {
    return this.request(`/patients/${patientId}/consultations`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  static async getConsultations(patientId: string) {
    return this.request(`/patients/${patientId}/consultations`, {
      method: "GET",
    })
  }

  // Alert endpoints
  static async getAlerts() {
    return this.request("/alerts", { method: "GET" })
  }

  static async markAlertAsRead(id: string) {
    return this.request(`/alerts/${id}/read`, { method: "PATCH" })
  }

  static async markAllAlertsAsRead() {
    return this.request("/alerts/read-all", { method: "PATCH" })
  }

  static async resolveAlert(id: string) {
    return this.request(`/alerts/${id}/resolve`, { method: "PATCH" })
  }

  // Reports endpoints
  static async getReports() {
    return this.request("/reports", { method: "GET" })
  }

  static async getReportDetails(id: string) {
    return this.request(`/reports/${id}`, { method: "GET" })
  }

  // Notifications endpoints
  static async getNotifications() {
    return this.request("/notifications", { method: "GET" })
  }

  static async markNotificationAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: "PATCH" })
  }
}
