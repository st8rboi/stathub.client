import type { BadgeTone } from '@/shared/ui/layout'
import type { MatchStatus } from './types'

export const matchStatusLabels: Record<MatchStatus, string> = {
  Scheduled: 'Запланирован',
  InProgress: 'Идёт',
  Pause: 'Пауза',
  Finished: 'Завершён',
  Cancelled: 'Отменён',
}

export const matchStatusTones: Record<MatchStatus, BadgeTone> = {
  Scheduled: 'neutral',
  InProgress: 'success',
  Pause: 'warning',
  Finished: 'neutral',
  Cancelled: 'danger',
}
