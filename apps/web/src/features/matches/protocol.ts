import type { GoalKind, ProtocolEvent, ProtocolEventType } from './types'

/** Момент события: с поправкой на часы устройства, у старых событий — клиентское время. */
export const eventTime = (event: ProtocolEvent) => Date.parse(event.occurredAtUtc ?? event.clientTimestampUtc)

export const isLifecycle = (type: ProtocolEventType) =>
  type === 'MatchStarted' ||
  type === 'MatchPaused' ||
  type === 'MatchResumed' ||
  type === 'PeriodStarted' ||
  type === 'MatchFinished'

export const isStatistic = (type: ProtocolEventType) =>
  type === 'Shot' || type === 'ShotOnTarget' || type === 'Foul' || type === 'Corner'

export interface ClockMark {
  period: number
  elapsedSeconds: number
}

/**
 * Игровое время каждого события — тот же расчёт, что у сервера (`MatchClock`): паузы внутри
 * периода не считаются, новый период обнуляет часы; если матч стоял на паузе, часы нового
 * периода стоят до продолжения. У событий жизненного цикла и до начала матча отметки нет.
 */
export function clockMarks(events: ProtocolEvent[]): Map<string, ClockMark> {
  const marks = new Map<string, ClockMark>()
  let period = 0
  let periodStart = 0
  let pausedAt: number | null = null
  let pausedMs = 0

  for (const event of events) {
    const at = eventTime(event)

    switch (event.type) {
      case 'MatchStarted':
        period = 1
        periodStart = at
        pausedAt = null
        pausedMs = 0
        break
      case 'MatchPaused':
        pausedAt ??= at
        break
      case 'MatchResumed':
        if (pausedAt !== null) pausedMs += Math.max(0, at - pausedAt)
        pausedAt = null
        break
      case 'PeriodStarted':
        period += 1
        periodStart = at
        pausedMs = 0
        pausedAt = pausedAt === null ? null : at
        break
      case 'MatchFinished':
        break
      default: {
        if (period === 0) break
        const clockAt = pausedAt !== null && pausedAt < at ? pausedAt : at
        marks.set(event.id, { period, elapsedSeconds: Math.max(0, Math.floor((clockAt - periodStart - pausedMs) / 1000)) })
      }
    }
  }

  return marks
}

/** Минута события «как в футболе»: 0:00–0:59 — 1-я минута. */
export const displayMinute = (mark: ClockMark) => Math.floor(mark.elapsedSeconds / 60) + 1

interface PeriodRun {
  /** Отрезки идущих часов периода в реальном времени; у последнего конец может быть открыт. */
  runs: { from: number; to: number | null }[]
  /** Если часы периода так и не пошли (пауза) — момент начала периода. */
  start: number
}

/** Отрезки игрового времени по периодам — для перевода «тайм + минута» в момент времени. */
function periodRuns(events: ProtocolEvent[]): PeriodRun[] {
  const periods: PeriodRun[] = []
  let running = false

  const current = () => periods[periods.length - 1]
  const stop = (at: number) => {
    const last = current()?.runs.at(-1)
    if (running && last && last.to === null) last.to = at
    running = false
  }

  for (const event of events) {
    const at = eventTime(event)

    switch (event.type) {
      case 'MatchStarted':
        periods.push({ runs: [{ from: at, to: null }], start: at })
        running = true
        break
      case 'MatchPaused':
        stop(at)
        break
      case 'MatchResumed':
        if (!running && current()) {
          current().runs.push({ from: at, to: null })
          running = true
        }
        break
      case 'PeriodStarted': {
        const wasRunning: boolean = running
        stop(at)
        periods.push({ runs: wasRunning ? [{ from: at, to: null }] : [], start: at })
        running = wasRunning
        break
      }
      case 'MatchFinished':
        stop(at)
        break
    }
  }

  return periods
}

/** Сколько периодов матча уже начато — в них организатор может добавить событие. */
export const startedPeriods = (events: ProtocolEvent[]) => periodRuns(events).length

/**
 * Момент времени для события на минуте `minute` периода `period` — середина этой минуты
 * игрового времени. Сервер по нему посчитает ту же минуту (паузы учтены).
 */
export function timeForMinute(events: ProtocolEvent[], period: number, minute: number): Date | null {
  const run = periodRuns(events)[period - 1]
  if (!run) return null

  const target = (Math.max(1, minute) - 1) * 60_000 + 30_000
  let played = 0

  for (const segment of run.runs) {
    const length = segment.to === null ? Number.POSITIVE_INFINITY : segment.to - segment.from
    if (played + length >= target) return new Date(segment.from + (target - played))
    played += length
  }

  // Часы остановлены раньше нужной минуты (матч закончен): ставим событие на последний отрезок.
  const last = run.runs.at(-1)
  return new Date(last ? (last.to ?? last.from) + (target - played) : run.start)
}

const goalKindLabels: Record<GoalKind, string> = {
  Regular: 'Гол',
  Penalty: 'Гол с пенальти',
  Bonus: 'Бонусный гол',
}

export const eventTypeLabels: Record<ProtocolEventType, string> = {
  Goal: 'Гол',
  OwnGoal: 'Автогол',
  YellowCard: 'Жёлтая карточка',
  RedCard: 'Красная карточка',
  Substitution: 'Замена',
  PenaltyMissed: 'Пенальти не забит',
  EventVoided: 'Отмена события',
  MatchStarted: 'Начало матча',
  MatchPaused: 'Пауза',
  MatchResumed: 'Продолжение',
  PeriodStarted: 'Начало периода',
  MatchFinished: 'Финальный свисток',
  Shot: 'Удар мимо',
  ShotOnTarget: 'Удар в створ',
  Foul: 'Фол',
  Corner: 'Угловой',
}

export const eventLabel = (event: ProtocolEvent) =>
  event.type === 'Goal' && event.goalKind ? goalKindLabels[event.goalKind] : eventTypeLabels[event.type]

/** Что добавляет организатор: голы разных видов, карточки, замена, незабитый пенальти. */
export type ProtocolChoice =
  | 'Goal'
  | 'PenaltyGoal'
  | 'BonusGoal'
  | 'OwnGoal'
  | 'PenaltyMissed'
  | 'YellowCard'
  | 'RedCard'
  | 'Substitution'

/** Тип события и вид гола на сервере для выбора в форме. */
export const choiceToEvent: Record<ProtocolChoice, { type: ProtocolEventType; goalKind: GoalKind | null }> = {
  Goal: { type: 'Goal', goalKind: 'Regular' },
  PenaltyGoal: { type: 'Goal', goalKind: 'Penalty' },
  BonusGoal: { type: 'Goal', goalKind: 'Bonus' },
  OwnGoal: { type: 'OwnGoal', goalKind: null },
  PenaltyMissed: { type: 'PenaltyMissed', goalKind: null },
  YellowCard: { type: 'YellowCard', goalKind: null },
  RedCard: { type: 'RedCard', goalKind: null },
  Substitution: { type: 'Substitution', goalKind: null },
}
