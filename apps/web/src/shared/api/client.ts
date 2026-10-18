import { clearTokens, getAccessToken, getTokens, setTokens } from './storage'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function parseError(response: Response): Promise<never> {
  let message = `${response.status} ${response.statusText}`

  try {
    // Бэкенд отдаёт ProblemDetails: detail — бизнес-ошибка, errors — ошибки валидации модели
    const problem = await response.json()
    if (problem.errors) message = Object.values<string[]>(problem.errors).flat().join('; ')
    else message = problem.detail ?? problem.title ?? message
  } catch {
    // тело не JSON — оставляем статус
  }

  throw new ApiError(response.status, message)
}

/** Один общий refresh: параллельные 401 не должны порождать несколько обновлений сессии. */
let refreshInFlight: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  const tokens = getTokens()
  if (!tokens) return false

  refreshInFlight ??= (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      })

      if (!response.ok) {
        clearTokens()
        return false
      }

      const refreshed = (await response.json()) as { accessToken: string; refreshToken: string }
      setTokens({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken })
      return true
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const accessToken = getAccessToken()
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  return fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/**
 * Запрос к API с авторизацией. На 401 один раз пробуем обновить сессию по refresh-токену
 * и повторяем запрос: судья/организатор не должен вылетать из-за истёкшего access-токена.
 */
export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response = await send(method, path, body)

  if (response.status === 401 && (await refreshSession())) {
    response = await send(method, path, body)
  }

  if (!response.ok) await parseError(response)

  return response.status === 204 ? (undefined as T) : response.json()
}

/** Загрузка файла (логотип): FormData, Content-Type выставляет браузер сам. */
export async function uploadFile<T>(path: string, file: File, retry = true): Promise<T> {
  const form = new FormData()
  form.append('file', file)

  const headers: Record<string, string> = {}
  const accessToken = getAccessToken()
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const response = await fetch(`/api${path}`, { method: 'POST', headers, body: form })

  if (response.status === 401 && retry && (await refreshSession()))
    return uploadFile<T>(path, file, false)

  if (!response.ok) await parseError(response)

  return (await response.json()) as T
}
