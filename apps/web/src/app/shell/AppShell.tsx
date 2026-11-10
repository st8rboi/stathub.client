import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/authContext'
import { BrandMark } from '@/shared/ui/BrandMark'
import { Icon } from '@/shared/ui/Icon'
import { Breadcrumbs } from './Breadcrumbs'
import { Sidebar } from './Sidebar'

const SIDEBAR_ID = 'app-sidebar'

/**
 * Каркас админки: боковое меню + контент. На экранах уже 960px меню уезжает
 * в выезжающую панель, которая открывается из верхней полосы.
 */
export function AppShell() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  // Переход на другую страницу закрывает мобильное меню (сброс состояния при смене адреса).
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setNavOpen(false)
  }

  useEffect(() => {
    if (!navOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  return (
    <div className={navOpen ? 'shell shell--nav-open' : 'shell'}>
      <header className="mobilebar">
        <button
          type="button"
          className="icon-button"
          aria-label="Открыть меню"
          aria-controls={SIDEBAR_ID}
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
        >
          <Icon name="menu" />
        </button>
        <Link to="/" className="brand" aria-label="Статхаб — к списку лиг">
          <BrandMark className="brand-mark" />
          <span className="brand-name">Статхаб</span>
        </Link>
        <span className="mobilebar-org">{user?.tenantName}</span>
      </header>

      <Sidebar id={SIDEBAR_ID} onClose={() => setNavOpen(false)} />
      <button
        type="button"
        className="shell-backdrop"
        aria-label="Закрыть меню"
        tabIndex={-1}
        onClick={() => setNavOpen(false)}
      />

      <div className="shell-main">
        <main className="content">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
