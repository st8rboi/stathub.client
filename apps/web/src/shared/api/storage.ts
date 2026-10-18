export interface StoredTokens {
  accessToken: string
  refreshToken: string
}

const STORAGE_KEY = 'stathub.auth'

export function getTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredTokens
    return parsed.accessToken && parsed.refreshToken ? parsed : null
  } catch {
    return null
  }
}

export function setTokens(tokens: StoredTokens): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  } catch {
    // localStorage недоступен — сессия проживёт до перезагрузки страницы
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function getAccessToken(): string | null {
  return getTokens()?.accessToken ?? null
}
