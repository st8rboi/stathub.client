import { Link } from 'react-router'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Menu, MenuButton, MenuEmpty, MenuTitle } from '@/shared/ui/Menu'
import { useAccounts, useAssignments, useAssignReferee, useRevokeAssignment } from '../hooks'

/**
 * Судья матча в строке списка. Назначен — «чип» с именем (меню: снять назначение);
 * не назначен — заметная кнопка «Назначить судью» со списком аккаунтов организации.
 */
export function RefereeAssign({ matchId }: { matchId: string }) {
  const users = useAccounts()
  const assignments = useAssignments()
  const assign = useAssignReferee()
  const revoke = useRevokeAssignment()

  if (assignments.isPending || users.isPending) return <span className="muted">…</span>

  if (assignments.error || users.error) {
    return (
      <span className="hint" title="Нет доступа к аккаунтам организации">
        нет доступа
      </span>
    )
  }

  const existing = (assignments.data ?? []).find(
    (assignment) => assignment.scopeType === 'Match' && assignment.scopeId === matchId,
  )
  const active = (users.data ?? []).filter((user) => user.isActive)
  // Сначала судьи; администраторы тоже могут судить (например, сам организатор).
  const referees = active.filter((user) => user.role === 'Referee')
  const others = active.filter((user) => user.role !== 'Referee')

  return (
    <>
      {existing ? (
        <Menu
          triggerClassName="referee-chip"
          triggerLabel={`Судья: ${existing.userDisplayName}`}
          align="end"
          trigger={
            <>
              <Icon name="flag" size={14} />
              <span className="referee-chip-name">{existing.userDisplayName}</span>
              <Icon name="chevron-down" size={14} />
            </>
          }
        >
          <MenuTitle>Судья матча</MenuTitle>
          <MenuButton danger disabled={revoke.isPending} onClick={() => revoke.mutate(existing.id)}>
            Снять назначение
          </MenuButton>
        </Menu>
      ) : (
        <Menu
          triggerClassName="referee-chip referee-chip--empty"
          align="end"
          trigger={
            <>
              <span className="referee-chip-name">Назначить судью</span>
              <Icon name="chevron-down" size={14} />
            </>
          }
        >
          <MenuTitle>Кто судит?</MenuTitle>
          {referees.map((user) => (
            <MenuButton
              key={user.id}
              disabled={assign.isPending}
              onClick={() => assign.mutate({ userId: user.id, role: 'Referee', scopeType: 'Match', scopeId: matchId })}
            >
              {user.displayName}
            </MenuButton>
          ))}
          {referees.length === 0 && (
            <MenuEmpty>
              Судей нет — <Link to="/referees">создать</Link>
            </MenuEmpty>
          )}
          {others.length > 0 && <MenuTitle>Администраторы</MenuTitle>}
          {others.map((user) => (
            <MenuButton
              key={user.id}
              disabled={assign.isPending}
              onClick={() => assign.mutate({ userId: user.id, role: 'Referee', scopeType: 'Match', scopeId: matchId })}
            >
              {user.displayName}
            </MenuButton>
          ))}
        </Menu>
      )}
      <ErrorText error={assign.error ?? revoke.error} />
    </>
  )
}
