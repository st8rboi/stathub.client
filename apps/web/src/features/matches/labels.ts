import type { MatchStatus } from './types'

export const matchStatusLabels: Record<MatchStatus, string> = {
  Scheduled: 'Запланирован',
  InProgress: 'Идёт',
  Pause: 'Пауза',
  Finished: 'Завершён',
  Cancelled: 'Отменён',
}
