import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { loadServerClockOffset } from '../src/api/serverClock'
import { AuthProvider, useAuth } from '../src/auth/AuthProvider'
import { requestSync, startOutboxSync } from '../src/events/syncEngine'
import { SettingsProvider } from '../src/settings/SettingsProvider'
import { colors } from '../src/theme'

// Один клиент на приложение. staleTime небольшой: статус матча меняет сам судья,
// и после каждого действия список инвалидируется запросом.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: 1,
    },
  },
})

/** Отправка офлайн-очереди живёт всё время работы приложения, независимо от открытого экрана. */
function OutboxSync() {
  const { status } = useAuth()

  useEffect(() => {
    void loadServerClockOffset()
    return startOutboxSync(queryClient)
  }, [])

  // После входа очередь, накопленная за время истёкшей сессии, уходит сразу.
  useEffect(() => {
    if (status === 'authenticated') void requestSync()
  }, [status])

  return null
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AuthProvider>
          <OutboxSync />
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.text,
                headerTitleStyle: { fontSize: 17, fontWeight: '600' },
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="index" options={{ title: 'Статхаб | АРМ Арбитра' }} />
              <Stack.Screen name="login" options={{ title: 'Вход', headerBackVisible: false }} />
              <Stack.Screen name="connect" options={{ title: 'Подключение к матчу' }} />
              <Stack.Screen name="scan" options={{ title: 'QR-код матча' }} />
              <Stack.Screen name="settings" options={{ title: 'Сервер' }} />
              <Stack.Screen name="stage/[stageId]" options={{ title: 'Матчи этапа' }} />
              <Stack.Screen name="match/[id]" options={{ title: 'Матч' }} />
            </Stack>
          </SafeAreaProvider>
        </AuthProvider>
      </SettingsProvider>
    </QueryClientProvider>
  )
}
