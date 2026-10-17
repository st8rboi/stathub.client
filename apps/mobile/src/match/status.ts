import type { Match, MatchStatus } from '../api/types'

export const statusLabels: Record<MatchStatus, string> = {
  Scheduled: 'Запланирован',
  InProgress: 'Идёт',
  Pause: 'Пауза',
  Finished: 'Завершён',
  Cancelled: 'Отменён',
}

export type StatusTone = 'neutral' | 'live' | 'pause' | 'done'

export const statusTones: Record<MatchStatus, StatusTone> = {
  Scheduled: 'neutral',
  InProgress: 'live',
  Pause: 'pause',
  Finished: 'done',
  Cancelled: 'done',
}

/**
 * Допустимые действия повторяют правила домена `Match`:
 * начать — только из Scheduled, остановить/завершить — только из InProgress,
 * возобновить — только из Pause, следующий период — из InProgress или Pause.
 * Клиент проверяет это, чтобы не показывать кнопки, которые сервер отклонит.
 */
export const canStart = (match: Match) => match.status === 'Scheduled'
export const canStop = (match: Match) => match.status === 'InProgress'
export const canResume = (match: Match) => match.status === 'Pause'
export const canFinish = (match: Match) => match.status === 'InProgress'
export const canStartNextPeriod = (match: Match) =>
  (match.status === 'InProgress' || match.status === 'Pause') && match.currentPeriod < match.periodsCount

export const isTerminal = (match: Match) => match.status === 'Finished' || match.status === 'Cancelled'

export function periodLabel(match: Match): string {
  if (match.currentPeriod <= 0) return 'Матч ещё не начат'
  return `Период ${match.currentPeriod} из ${match.periodsCount}`
}
