import { postAnonymous, request } from '@/shared/api/client'
import type { AuthResult, UserProfile } from './types'

/**
 * Вход по логину и паролю. Публичной регистрации нет: аккаунт выдаёт платформа
 * (организатору) или организатор (судье).
 */
export const authApi = {
  login: (login: string, password: string) => postAnonymous<AuthResult>('/auth/login', { login, password }),

  logout: (refreshToken: string) => postAnonymous<void>('/auth/logout', { refreshToken }),

  me: () => request<UserProfile>('GET', '/auth/me'),
}
