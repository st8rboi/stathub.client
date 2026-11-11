import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { initials } from '@/shared/lib/initials'
import { Icon, type IconName } from './Icon'

/** Шапка страницы: медиа (логотип), заголовок, мета-строка (статусы, даты) и действия справа. */
export function PageHeader({
  title,
  eyebrow,
  media,
  meta,
  actions,
}: {
  title: ReactNode
  eyebrow?: ReactNode
  media?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="page-header">
      {media && <div className="page-header-media">{media}</div>}
      <div className="page-header-main">
        {eyebrow && <p className="page-header-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {meta && <div className="page-header-meta">{meta}</div>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}

/** Карточка-секция с необязательным заголовком и действиями. `flush` — без внутренних отступов (для таблиц). */
export function Card({
  title,
  actions,
  flush = false,
  tone,
  children,
}: {
  title?: ReactNode
  actions?: ReactNode
  flush?: boolean
  /** danger — блок необратимых действий («Опасная зона»). */
  tone?: 'danger'
  children: ReactNode
}) {
  return (
    <section className={tone ? `card card--${tone}` : 'card'}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="actions">{actions}</div>}
        </header>
      )}
      <div className={flush ? 'card-body card-body--flush' : 'card-body'}>{children}</div>
    </section>
  )
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

/** Бейдж статуса: цвет передаёт смысл, текст — точное значение. */
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={tone === 'neutral' ? 'badge' : `badge badge--${tone}`}>{children}</span>
}

export interface TabItem {
  to: string
  label: ReactNode
  /** Активна только при точном совпадении адреса (для вкладки по умолчанию). */
  end?: boolean
  count?: number
}

/** Вкладки-ссылки: каждая вкладка — свой адрес, поэтому работают «назад» и ссылки на раздел. */
export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav className="tabs" aria-label={label}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className="tab">
          {item.label}
          {item.count !== undefined && <span className="tab-count">{item.count}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

/** Пустой список: что здесь будет и как это создать. */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: IconName
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty">
      {icon && (
        <span className="empty-icon">
          <Icon name={icon} />
        </span>
      )}
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  )
}

export function Loading({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <p className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  )
}

/** Логотип сущности (лиги, команды) или заглушка с инициалами, если логотипа нет. */
/** Фото человека (игрока) в круге; без фото — инициалы. */
export function PersonAvatar({ src, name, size = 'md' }: { src: string | null; name: string; size?: 'md' | 'lg' }) {
  const className = size === 'lg' ? 'person-avatar person-avatar--lg' : 'person-avatar'
  if (src) return <img src={src} alt="" className={className} />
  return (
    <span className={className} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

export function LogoBadge({ src, name, size = 'md' }: { src: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  if (src) return <img src={src} alt="" className={`logo-badge logo-badge--${size}`} />
  return (
    <span className={`logo-badge logo-badge--${size} logo-badge--empty`} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
