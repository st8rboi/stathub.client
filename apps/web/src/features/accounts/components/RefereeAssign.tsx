import { useState } from 'react'
import { Link } from 'react-router'
import { useAccounts, useAssignments, useAssignReferee, useRevokeAssignment } from '../hooks'

/**
 * Назначение судьи в строке матча. Состояния явные: загрузка, нет доступа,
 * нет аккаунтов (со ссылкой на раздел «Судьи»), уже назначен (имя + снять),
 * либо выбор из аккаунтов организации.
 */
export function RefereeAssign({ matchId }: { matchId: string }) {
  const users = useAccounts()
  const assignments = useAssignments()
  const assign = useAssignReferee()
  const revoke = useRevokeAssignment()

  const [selectedUserId, setSelectedUserId] = useState('')
  const [open, setOpen] = useState(false)

  if (assignments.isPending || users.isPending) return <span className="muted">…</span>

  if (assignments.error || users.error) {
    return (
      <span className="muted" title="Нет доступа к аккаунтам организации">
        нет доступа
      </span>
    )
  }

  const existing = (assignments.data ?? []).find(
    (assignment) => assignment.scopeType === 'Match' && assignment.scopeId === matchId,
  )

  if (existing) {
    return (
      <span className="referee-cell">
        <span className="referee-name">{existing.userDisplayName}</span>
        <button
          type="button"
          className="danger"
          disabled={revoke.isPending}
          onClick={() => revoke.mutate(existing.id)}
        >
          Снять
        </button>
      </span>
    )
  }

  const referees = (users.data ?? []).filter((user) => user.isActive)

  if (referees.length === 0) {
    return (
      <span className="muted">
        нет аккаунтов — <Link to="/accounts">создать</Link>
      </span>
    )
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}>
        Назначить
      </button>
    )
  }

  return (
    <span className="referee-cell">
      <select
        value={selectedUserId}
        onChange={(event) => setSelectedUserId(event.target.value)}
        aria-label="Судья"
      >
        <option value="">кто судит?</option>
        {referees.map((user) => (
          <option key={user.id} value={user.id}>
            {user.displayName}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!selectedUserId || assign.isPending}
        onClick={() =>
          assign.mutate(
            { userId: selectedUserId, role: 'Referee', scopeType: 'Match', scopeId: matchId },
            {
              onSuccess: () => {
                setSelectedUserId('')
                setOpen(false)
              },
            },
          )
        }
      >
        ОК
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        Отмена
      </button>
    </span>
  )
}
