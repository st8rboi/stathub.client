import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { normalizeBaseUrl, setApiBaseUrl } from '../api/client'
import { loadApiBaseUrl, saveApiBaseUrl } from '../storage/settings'
import { colors, fontSize, spacing } from '../theme'

type SettingsContextValue = {
  baseUrl: string
  saveBaseUrl: (value: string) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

/**
 * Адрес сервера живёт в AsyncStorage и пробрасывается в HTTP-клиент до первого запроса,
 * поэтому дочерние экраны рендерятся только после загрузки настроек.
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [baseUrl, setBaseUrl] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    void loadApiBaseUrl().then((value) => {
      if (!active) return
      setApiBaseUrl(value)
      setBaseUrl(value)
      setReady(true)
    })

    return () => {
      active = false
    }
  }, [])

  const saveBaseUrl = useCallback(async (value: string) => {
    const normalized = normalizeBaseUrl(value)
    await saveApiBaseUrl(normalized)
    setApiBaseUrl(normalized)
    setBaseUrl(normalized)
  }, [])

  const value = useMemo(() => ({ baseUrl, saveBaseUrl }), [baseUrl, saveBaseUrl])

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.bootText}>Загрузка настроек…</Text>
      </View>
    )
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext)
  if (!value) {
    throw new Error('useSettings использован вне SettingsProvider')
  }
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
