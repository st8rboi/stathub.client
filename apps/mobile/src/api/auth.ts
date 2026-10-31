import { normalizeBaseUrl } from '../api/client'
import { getApiBaseUrl } from '../api/client'

export type AuthUser = {
  id: string
  login: string
  displayName: string
  email: string | null
  tenantId: string
  tenantName: string
  tenantSlug: string
  role: 'Organizer' | 'Admin' | 'Referee' | 'Coach'
}

export type AuthResult = {
  accessToken: string
  accessTokenExpiresAtUtc: string
  refreshToken: string
  refreshTokenExpiresAtUtc: string
  user: AuthUser
}

type ProblemDetails = {
  detail?: string
  title?: string
  errors?: Record<string, string[]>
}

/** Сервер ответил отказом. Сетевая ошибка сюда не попадает: без ответа о сессии ничего не известно. */
export class AuthRejectedError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AuthRejectedError'
    this.status = status
  }
}

const AUTH_TIMEOUT_MS = 10_000

async function post<T>(path: string, body: unknown): Promise<T> {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) throw new Error('Не задан адрес сервера.')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    let message = `Ошибка ${response.status}`

    try {
      const problem = (await response.json()) as ProblemDetails
      if (problem.errors) message = Object.values<string[]>(problem.errors).flat().join('; ')
      else message = problem.detail ?? problem.title ?? message
    } catch {
      // тело не JSON
    }

    throw new AuthRejectedError(response.status, message)
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

/**
 * Вход по логину и паролю. Публичной регистрации нет: аккаунт судье выдаёт организатор
 * (или платформа — организатору).
 */
export const authApi = {
  login: (login: string, password: string) => post<AuthResult>('/auth/login', { login, password }),

  logout: (refreshToken: string) => post<void>('/auth/logout', { refreshToken }),

  /** Обновление сессии по refresh-токену: вызывается клиентом при 401. */
  refresh: (refreshToken: string) =>
    post<AuthResult>('/auth/refresh', { refreshToken }),
}
