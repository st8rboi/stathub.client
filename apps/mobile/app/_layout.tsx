import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthProvider } from '../src/auth/AuthProvider'
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

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AuthProvider>
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
              <Stack.Screen name="create" options={{ title: 'Новый матч' }} />
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
