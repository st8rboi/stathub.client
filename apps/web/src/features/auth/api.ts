import { ApiError } from '@/shared/api/client'
import type { AuthResult, UserProfile } from './types'

type ProblemDetails = {
  detail?: string
  title?: string
  errors?: Record<string, string[]>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`

    try {
      const problem = (await response.json()) as ProblemDetails
      if (problem.errors) message = Object.values<string[]>(problem.errors).flat().join('; ')
      else message = problem.detail ?? problem.title ?? message
    } catch {
      // тело не JSON
    }

    throw new ApiError(response.status, message)
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

/**
 * Вход по логину и паролю. Публичной регистрации нет: аккаунт выдаёт платформа
 * (организатору) или организатор (судье).
 */
export const authApi = {
  login: (login: string, password: string) => post<AuthResult>('/auth/login', { login, password }),

  logout: (refreshToken: string) => post<void>('/auth/logout', { refreshToken }),

  me: async (): Promise<UserProfile> => {
    const { request } = await import('@/shared/api/client')
    return request<UserProfile>('GET', '/auth/me')
  },
}
