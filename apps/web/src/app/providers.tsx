import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { OrganizerProvider } from '@/features/organizer/OrganizerProvider'
import { ConfirmProvider } from '@/shared/ui/ConfirmProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    // Ошибки API (404/409/400) не лечатся повтором — показываем их сразу
    queries: { retry: false },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizerProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </OrganizerProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
