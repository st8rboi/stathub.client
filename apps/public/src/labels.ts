import type { PublicMatch } from '@/api/types'

export const matchStatusLabels: Record<string, string> = {
  Scheduled: 'Запланирован',
  InProgress: 'Идёт',
  Pause: 'Пауза',
  Finished: 'Завершён',
  Cancelled: 'Отменён',
}

export const tournamentStatusLabels: Record<string, string> = {
  Scheduled: 'Запланирован',
  Active: 'Идёт',
  Completed: 'Завершён',
  Cancelled: 'Отменён',
}

export const stageFormatLabels: Record<string, string> = {
  Round: 'Круговая',
  Playoff: 'Плей-офф',
}

export const eventTypeLabels: Record<string, string> = {
  Goal: 'Гол',
  OwnGoal: 'Автогол',
  YellowCard: 'Жёлтая карточка',
  RedCard: 'Красная карточка',
  Substitution: 'Замена',
  EventVoided: 'Отмена события',
  MatchStarted: 'Начало матча',
  PeriodStarted: 'Начало периода',
  MatchFinished: 'Финальный свисток',
}

export function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Секундомер периода: паузы не считаются игровым временем, на паузе часы стоят. */
export function formatElapsed(
  match: Pick<PublicMatch, 'periodStartedAtUtc' | 'pausedAtUtc' | 'periodPausedMilliseconds'>,
  nowMs = Date.now(),
): string {
  if (!match.periodStartedAtUtc) return '—'

  const startedMs = new Date(match.periodStartedAtUtc).getTime()
  if (Number.isNaN(startedMs)) return '—'

  const endMs = match.pausedAtUtc ? new Date(match.pausedAtUtc).getTime() : nowMs
  const totalSeconds = Math.max(0, Math.floor((endMs - startedMs - match.periodPausedMilliseconds) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const isLiveMatch = (status: string) => status === 'InProgress' || status === 'Pause'
