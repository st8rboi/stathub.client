import { Link, NavLink } from 'react-router'
import { useAuth } from '@/features/auth/authContext'
import { useLeagues } from '@/features/leagues/hooks'
import { useOrganizer } from '@/features/organizer/organizerContext'
import { initials } from '@/shared/lib/initials'
import { BrandMark } from '@/shared/ui/BrandMark'
import { Icon } from '@/shared/ui/Icon'

/**
 * Главное меню. Лиги организатора выведены прямо в меню — в соревнование
 * можно попасть в один клик с любой страницы.
 */
export function Sidebar({ id, onClose }: { id: string; onClose: () => void }) {
  const { user, logout } = useAuth()
  const { organizerId } = useOrganizer()
  const leagues = useLeagues(organizerId, Boolean(organizerId))

  return (
    <aside id={id} className="sidebar" aria-label="Главное меню">
      <div className="sidebar-head">
        <Link to="/" className="brand" aria-label="Статхаб — к списку лиг">
          <BrandMark className="brand-mark" />
          <span className="brand-text">
            <span className="brand-name">Статхаб</span>
            <span className="brand-sub">Администратор</span>
          </span>
        </Link>
        <button type="button" className="icon-button sidebar-close" aria-label="Закрыть меню" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>

      <nav className="sidebar-nav">
        <p className="sidebar-section">Соревнования</p>
        <NavLink to="/" end className="sidebar-link">
          <Icon name="trophy" />
          Все лиги
        </NavLink>
        {leagues.data && leagues.data.length > 0 && (
          <ul className="sidebar-leagues">
            {leagues.data.map((league) => (
              <li key={league.id}>
                <NavLink to={`/leagues/${league.id}`} className="sidebar-league" title={league.name}>
                  {league.logoUrl ? (
                    <img src={league.logoUrl} alt="" className="sidebar-league-logo" />
                  ) : (
                    <span className="sidebar-league-logo" aria-hidden="true">
                      {initials(league.name)}
                    </span>
                  )}
                  <span className="sidebar-league-name">{league.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}

        <p className="sidebar-section">Справочники</p>
        <NavLink to="/teams" className="sidebar-link">
          <Icon name="shield" />
          Команды
        </NavLink>
        <NavLink to="/players" className="sidebar-link">
          <Icon name="user" />
          Игроки
        </NavLink>

        <p className="sidebar-section">Люди</p>
        <NavLink to="/referees" className="sidebar-link">
          <Icon name="flag" />
          Судьи
        </NavLink>
        <NavLink to="/statisticians" className="sidebar-link">
          <Icon name="chart" />
          Статистики
        </NavLink>
        <NavLink to="/admins" className="sidebar-link">
          <Icon name="idcard" />
          Администраторы
        </NavLink>
      </nav>

      <div className="sidebar-foot">
        <span className="avatar" aria-hidden="true">
          {initials(user?.displayName) || '?'}
        </span>
        <span className="sidebar-user">
          <span className="sidebar-user-name">{user?.displayName ?? '—'}</span>
          <span className="sidebar-user-org">{user?.tenantName ?? ''}</span>
        </span>
        <button type="button" className="icon-button" aria-label="Выйти" title="Выйти" onClick={() => void logout()}>
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  )
}
