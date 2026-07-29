import { MOCK_MATRONES } from "./mock-data"
import type { MatroneAccount } from "./types"

const STORAGE_KEY_MATRONES = "matrones"

export function loadMatroneAccounts(): MatroneAccount[] {
  if (typeof window === "undefined") {
    return []
  }

  const stored = window.localStorage.getItem(STORAGE_KEY_MATRONES)
  if (!stored) {
    return MOCK_MATRONES
  }

  try {
    return JSON.parse(stored) as MatroneAccount[]
  } catch {
    return MOCK_MATRONES
  }
}

export function saveMatroneAccounts(accounts: MatroneAccount[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(STORAGE_KEY_MATRONES, JSON.stringify(accounts))
}

export function clearStoredMatrones() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY_MATRONES)
}
