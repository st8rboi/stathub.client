import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { authApi, type AuthUser } from '../api/auth'
import { clearTokens, loadTokens, saveTokens, setCachedAccessToken } from './tokens'
import { colors, fontSize, spacing } from '../theme'

type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  login: (login: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Сессия судьи. Токены лежат в AsyncStorage (офлайн-очередь событий тоже локальная),
 * access-токен — в памяти клиента. Пока идёт восстановление сессии, экраны не рендерятся.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    let active = true

    void loadTokens().then((tokens) => {
      if (!active) return

      // Токены есть — считаем сессию рабочей; если сервер их отвергнет,
      // первый же запрос получит 401 и клиент попробует refresh.
      if (tokens) {
        setStatus('authenticated')
        return
      }

      setStatus('anonymous')
    })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (loginValue: string, password: string) => {
    const result = await authApi.login(loginValue, password)
    await saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken })
    setUser(result.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      const tokens = await loadTokens()
      if (tokens) await authApi.logout(tokens.refreshToken)
    } catch {
      // даже без сети локально выходим
    }

    await clearTokens()
    setCachedAccessToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout])

  if (status === 'loading') {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.bootText}>Проверяем сессию…</Text>
      </View>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth использован вне AuthProvider')
  return value
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(3),
    backgroundColor: colors.background,
  },
  bootText: {
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
})
