import type { ReactNode } from 'react'
import { formatDate } from '@/shared/lib/format'
import { initials } from '@/shared/lib/initials'
import { Badge, Card } from '@/shared/ui/layout'
import { roleLabels, roleTones } from '../labels'
import type { AccountUser } from '../types'

/**
 * Таблица аккаунтов организации. Дополнительный столбец (например, «Назначения» у судей)
 * передаётся через `extraColumn`.
 */
export function AccountsTable({
  users,
  showRole = false,
  extraColumn,
}: {
  users: AccountUser[]
  showRole?: boolean
  extraColumn?: { title: string; render: (user: AccountUser) => ReactNode }
}) {
  // Активные сверху, внутри — по имени.
  const sorted = [...users].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || a.displayName.localeCompare(b.displayName, 'ru'),
  )

  return (
    <Card flush>
      <table className="data-table">
        <thead>
          <tr>
            <th>Имя и логин</th>
            {showRole && <th>Роль</th>}
            {extraColumn && <th>{extraColumn.title}</th>}
            <th className="col-secondary">Создан</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((user) => (
            <tr key={user.id}>
              <td>
                <div className="cell-main">
                  <span className="person-avatar" aria-hidden="true">
                    {initials(user.displayName)}
                  </span>
                  <span className="cell-text">
                    <strong>{user.displayName}</strong>
                    <span className="cell-sub mono">{user.login}</span>
                  </span>
                </div>
              </td>
              {showRole && (
                <td>
                  <Badge tone={roleTones[user.role]}>{roleLabels[user.role]}</Badge>
                </td>
              )}
              {extraColumn && <td>{extraColumn.render(user)}</td>}
              <td className="col-secondary muted">{formatDate(user.createdAtUtc)}</td>
              <td>
                {user.isActive ? <Badge tone="success">Активен</Badge> : <Badge>Отключён</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
