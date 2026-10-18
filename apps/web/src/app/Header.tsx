import { NavLink } from 'react-router'
import { useAuth } from '@/features/auth/authContext'

/**
 * Шапка админки: организация и пользователь берутся из токена.
 * Раньше здесь вводился organizerId руками — из-за этого можно было писать в чужой тенант.
 */
export function Header() {
  const { user, logout } = useAuth()

  return (
    <header>
      <NavLink to="/" className="brand">
        Stathub | Администратор
      </NavLink>

      <nav className="nav">
        <NavLink to="/" end>
          Лиги
        </NavLink>
        <NavLink to="/teams">Команды</NavLink>
        <NavLink to="/players">Игроки</NavLink>
        <NavLink to="/accounts">Судьи</NavLink>
      </nav>

      <div className="userbox">
        <span className="userbox-org">{user?.tenantName ?? '—'}</span>
        <span className="userbox-name">{user?.displayName ?? ''}</span>
        <button type="button" className="userbox-logout" onClick={() => void logout()}>
          Выйти
        </button>
      </div>
    </header>
  )
}
