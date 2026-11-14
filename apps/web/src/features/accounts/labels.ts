import type { BadgeTone } from '@/shared/ui/layout'
import type { AccountRole } from './types'

export const roleLabels: Record<AccountRole, string> = {
  Organizer: 'Организатор',
  Admin: 'Администратор',
  Referee: 'Судья',
  Coach: 'Тренер',
  Statistician: 'Статистик',
}

export const roleTones: Record<AccountRole, BadgeTone> = {
  Organizer: 'info',
  Admin: 'neutral',
  Referee: 'neutral',
  Coach: 'neutral',
  Statistician: 'neutral',
}

/** Роли раздела «Администраторы»: те, кто ведёт соревнования в админке. */
export const ADMIN_ROLES: AccountRole[] = ['Organizer', 'Admin']
