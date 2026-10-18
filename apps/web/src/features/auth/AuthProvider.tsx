import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearTokens, getTokens, setTokens } from '@/shared/api/storage'
import { authApi } from './api'
import { AuthContext, type AuthStatus } from './authContext'
import type { UserProfile } from './types'

/**
 * Состояние сессии администратора. Токены в localStorage, профиль тянем при старте:
 * если access истёк — клиент сам обновит его по refresh-токену.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      if (!getTokens()) {
        if (!cancelled) setStatus('anonymous')
        return
      }

      try {
        const profile = await authApi.me()
        if (cancelled) return
        setUser(profile)
        setStatus('authenticated')
      } catch {
        clearTokens()
        if (cancelled) return
        setUser(null)
        setStatus('anonymous')
      }
    }

    void restore()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (loginValue: string, password: string) => {
    const result = await authApi.login(loginValue, password)
    setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken })
    setUser(result.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    const tokens = getTokens()

    if (tokens) {
      try {
        await authApi.logout(tokens.refreshToken)
      } catch {
        // даже если сервер недоступен — локально сессию закрываем
      }
    }

    clearTokens()
    setUser(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  const value = useMemo(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
