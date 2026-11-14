import { Link, Outlet } from 'react-router'
import { useAuth } from '@/features/auth/authContext'
import { BrandMark } from '@/shared/ui/BrandMark'
import { Icon } from '@/shared/ui/Icon'

/**
 * Каркас рабочего места статистика: без меню админки — ему доступны только назначенные матчи.
 * Узкая колонка: статистик часто работает с телефона или планшета у кромки поля.
 */
export function StatisticianShell() {
  const { user, logout } = useAuth()

  return (
    <div className="stat-shell">
      <header className="stat-topbar">
        <Link to="/stats" className="brand" aria-label="Статхаб — мои матчи">
          <BrandMark className="brand-mark" />
          <span className="brand-text">
            <span className="brand-name">Статхаб</span>
            <span className="brand-sub">Статистик</span>
          </span>
        </Link>
        <span className="stat-topbar-user">{user?.displayName}</span>
        <button type="button" className="icon-button" aria-label="Выйти" title="Выйти" onClick={() => void logout()}>
          <Icon name="logout" />
        </button>
      </header>

      <main className="stat-content">
        <Outlet />
      </main>
    </div>
  )
}
