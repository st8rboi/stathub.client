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

type PeriodClock = Pick<PublicMatch, 'periodStartedAtUtc' | 'pausedAtUtc' | 'periodPausedMilliseconds'>

/** Игровые секунды текущего периода: паузы не считаются, на паузе часы стоят. */
export function periodElapsedSeconds(match: PeriodClock, nowMs = Date.now()): number | null {
  if (!match.periodStartedAtUtc) return null

  const startedMs = new Date(match.periodStartedAtUtc).getTime()
  if (Number.isNaN(startedMs)) return null

  const endMs = match.pausedAtUtc ? new Date(match.pausedAtUtc).getTime() : nowMs
  return Math.max(0, Math.floor((endMs - startedMs - match.periodPausedMilliseconds) / 1000))
}

/**
 * Минута матча как на флешскоре: идущая минута (0:30 → 1'), периоды продолжают отсчёт
 * (второй тайм 25-минутных периодов начинается с 26'), добавленное время — «25+2'».
 * Без длительности периода по регламенту считаем минуту внутри периода.
 */
export function formatMinute(period: number, elapsedSeconds: number, periodDurationMinutes?: number): string {
  const minute = Math.floor(Math.max(0, elapsedSeconds) / 60) + 1

  if (!periodDurationMinutes || periodDurationMinutes <= 0) return `${minute}'`

  const offset = (Math.max(1, period) - 1) * periodDurationMinutes
  return minute > periodDurationMinutes
    ? `${offset + periodDurationMinutes}+${minute - periodDurationMinutes}'`
    : `${offset + minute}'`
}

/** Секундомер периода: паузы не считаются игровым временем, на паузе часы стоят. */
export function formatElapsed(match: PeriodClock, nowMs = Date.now()): string {
  const totalSeconds = periodElapsedSeconds(match, nowMs)
  if (totalSeconds === null) return '—'

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const isLiveMatch = (status: string) => status === 'InProgress' || status === 'Pause'

/** «Сажин Алексей Николаевич» → «Сажин А.»: в протоколе, как на флешскоре, фамилия и инициал. */
export function shortPlayerName(fullName: string): string {
  const [lastName, firstName] = fullName.trim().split(/\s+/)
  if (!lastName) return fullName
  return firstName ? `${lastName} ${firstName.charAt(0)}.` : lastName
}

/**
 * Подпись соревнования матча. Дивизион приходит, только когда их в турнире несколько, —
 * тогда он важнее названия этапа: «Первый дивизион · Плей-офф».
 */
export function competitionLabel(stageName: string, divisionName?: string | null): string {
  return divisionName ? `${divisionName} · ${stageName}` : stageName
}
