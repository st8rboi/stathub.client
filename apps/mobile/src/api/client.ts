/**
 * HTTP-клиент судейского приложения.
 *
 * Отличия от админского клиента (apps/web): адрес сервера настраивается на устройстве
 * (судья в поле не ходит через dev-прокси), а любая сетевая ошибка приводится
 * к понятному русскому сообщению — судья не должен читать `TypeError: Network request failed`.
 *
 * Авторизация: access-токен в памяти (читается синхронно), на 401 клиент один раз
 * обновляет сессию по refresh-токену и повторяет запрос.
 */
import { authApi } from './auth'
import {
  clearTokens,
  getCachedAccessToken,
  getRefreshToken,
  saveTokens,
  setCachedAccessToken,
} from '../auth/tokens'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }

  /** status = 0 — запрос не дошёл до сервера (нет сети, неверный адрес, таймаут). */
  get isNetworkError(): boolean {
    return this.status === 0
  }
}

const REQUEST_TIMEOUT_MS = 10_000

let baseUrl = ''

export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  return withScheme.replace(/\/+$/, '')
}

export function setApiBaseUrl(value: string): void {
  baseUrl = normalizeBaseUrl(value)
}

export function getApiBaseUrl(): string {
  return baseUrl
}

type ProblemDetails = {
  detail?: string
  title?: string
  errors?: Record<string, string[]>
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const problem = (await response.json()) as ProblemDetails
    // Ошибки валидации модели приходят в errors, бизнес-ошибки — в detail (см. GlobalExceptionHandler).
    if (problem.errors) {
      return Object.values<string[]>(problem.errors).flat().join('; ')
    }
    return problem.detail ?? problem.title ?? `Ошибка ${response.status}`
  } catch {
    return `Ошибка ${response.status}`
  }
}

let refreshInFlight: Promise<boolean> | null = null

/** Один общий refresh на все параллельные 401. */
async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const refreshToken = await getRefreshToken()
      if (!refreshToken) return false

      const result = await authApi.refresh(refreshToken)
      await saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken })
      return true
    } catch {
      await clearTokens()
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

async function send(
  method: string,
  path: string,
  body: unknown,
  signal: AbortSignal,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const accessToken = getCachedAccessToken()
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!baseUrl) {
    throw new ApiError(0, 'Не задан адрес сервера. Откройте «Настройки» и укажите адрес.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await send(method, path, body, controller.signal)

    if (response.status === 401 && (await refreshSession())) {
      response = await send(method, path, body, controller.signal)
    }
  } catch {
    throw new ApiError(
      0,
      controller.signal.aborted
        ? 'Сервер не ответил за 10 секунд. Проверьте адрес и сеть.'
        : 'Нет связи с сервером. Проверьте адрес в настройках и подключение к сети.',
    )
  } finally {
    clearTimeout(timeout)
  }

  if (response.status === 401) {
    setCachedAccessToken(null)
    throw new ApiError(401, 'Сессия истекла. Войдите заново.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
