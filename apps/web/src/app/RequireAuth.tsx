import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/authContext'

/**
 * Защита всех экранов админки: без активной сессии отправляем на вход,
 * запомнив адрес, чтобы вернуться после логина.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <p className="loading">Загрузка…</p>

  if (status === 'anonymous')
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />

  return <>{children}</>
}

/**
 * Админка — для организатора и сотрудников. Статистику в ней делать нечего (и API ему закрыт),
 * поэтому после входа он попадает на своё рабочее место со списком назначенных матчей.
 */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  if (user?.role === 'Statistician') return <Navigate to="/stats" replace />

  return <>{children}</>
}
