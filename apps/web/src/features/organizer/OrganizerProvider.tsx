import type { ReactNode } from 'react'
import { useAuth } from '@/features/auth/authContext'
import { OrganizerContext } from './organizerContext'

/**
 * Организация для запросов берётся из профиля сессии (tenant_id в токене).
 * Так организатор физически не может выбрать чужой organizerId.
 */
export function OrganizerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const organizerId = user?.tenantId ?? ''

  return <OrganizerContext value={{ organizerId }}>{children}</OrganizerContext>
}
