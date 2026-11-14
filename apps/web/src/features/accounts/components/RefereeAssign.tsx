import { Link } from 'react-router'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon, type IconName } from '@/shared/ui/Icon'
import { Menu, MenuButton, MenuEmpty, MenuTitle } from '@/shared/ui/Menu'
import { useAccounts, useAssignments, useAssignToMatch, useRevokeAssignment } from '../hooks'
import type { AccountUser } from '../types'

type MatchRole = 'Referee' | 'Statistician'

interface RoleCopy {
  icon: IconName
  /** Подпись назначенного: «Судья: Иванов». */
  assigned: string
  assign: string
  pick: string
  empty: string
  createPath: string
  /** Пустой чип: судья нужен каждому матчу (акцент), статистик — по желанию. */
  emptyClassName: string
  /** Кого ещё можно назначить на эту роль, кроме аккаунтов самой роли. */
  others: (user: AccountUser) => boolean
}

const copy: Record<MatchRole, RoleCopy> = {
  Referee: {
    icon: 'flag',
    assigned: 'Судья',
    assign: 'Назначить судью',
    pick: 'Кто судит?',
    empty: 'Судей нет',
    createPath: '/referees',
    emptyClassName: 'referee-chip referee-chip--empty',
    // Администраторы тоже могут судить (например, сам организатор).
    others: (user) => user.role === 'Organizer' || user.role === 'Admin',
  },
  Statistician: {
    icon: 'chart',
    assigned: 'Статистик',
    assign: 'Назначить статистика',
    pick: 'Кто ведёт статистику?',
    empty: 'Статистиков нет',
    createPath: '/statisticians',
    emptyClassName: 'referee-chip referee-chip--optional',
    // Организатор и так видит матч целиком; статистику ведут отдельные аккаунты.
    others: () => false,
  },
}

/**
 * Человек на матче в строке списка. Назначен — «чип» с именем (меню: снять назначение);
 * не назначен — кнопка «Назначить…» со списком аккаунтов организации.
 */
function MatchStaffAssign({ matchId, role }: { matchId: string; role: MatchRole }) {
  const users = useAccounts()
  const assignments = useAssignments()
  const assign = useAssignToMatch()
  const revoke = useRevokeAssignment()
  const text = copy[role]

  if (assignments.isPending || users.isPending) return <span className="muted">…</span>

  if (assignments.error || users.error) {
    return (
      <span className="hint" title="Нет доступа к аккаунтам организации">
        нет доступа
      </span>
    )
  }

  const existing = (assignments.data ?? []).find(
    (assignment) => assignment.scopeType === 'Match' && assignment.scopeId === matchId && assignment.role === role,
  )
  const active = (users.data ?? []).filter((user) => user.isActive)
  const own = active.filter((user) => user.role === role)
  const others = active.filter(text.others)

  const pick = (user: AccountUser) => (
    <MenuButton
      key={user.id}
      disabled={assign.isPending}
      onClick={() => assign.mutate({ userId: user.id, role, scopeType: 'Match', scopeId: matchId })}
    >
      {user.displayName}
    </MenuButton>
  )

  return (
    <>
      {existing ? (
        <Menu
          triggerClassName="referee-chip"
          triggerLabel={`${text.assigned}: ${existing.userDisplayName}`}
          align="end"
          trigger={
            <>
              <Icon name={text.icon} size={14} />
              <span className="referee-chip-name">{existing.userDisplayName}</span>
              <Icon name="chevron-down" size={14} />
            </>
          }
        >
          <MenuTitle>{text.assigned} матча</MenuTitle>
          <MenuButton danger disabled={revoke.isPending} onClick={() => revoke.mutate(existing.id)}>
            Снять назначение
          </MenuButton>
        </Menu>
      ) : (
        <Menu
          triggerClassName={text.emptyClassName}
          align="end"
          trigger={
            <>
              <span className="referee-chip-name">{text.assign}</span>
              <Icon name="chevron-down" size={14} />
            </>
          }
        >
          <MenuTitle>{text.pick}</MenuTitle>
          {own.map(pick)}
          {own.length === 0 && (
            <MenuEmpty>
              {text.empty} — <Link to={text.createPath}>создать</Link>
            </MenuEmpty>
          )}
          {others.length > 0 && <MenuTitle>Администраторы</MenuTitle>}
          {others.map(pick)}
        </Menu>
      )}
      <ErrorText error={assign.error ?? revoke.error} />
    </>
  )
}

/** Судья матча: ведёт матч в приложении судьи. */
export function RefereeAssign({ matchId }: { matchId: string }) {
  return <MatchStaffAssign matchId={matchId} role="Referee" />
}

/** Статистик матча: считает удары, фолы и угловые на своём рабочем месте. */
export function StatisticianAssign({ matchId }: { matchId: string }) {
  return <MatchStaffAssign matchId={matchId} role="Statistician" />
}
