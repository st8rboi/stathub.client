import type { Match, MatchEvent, MatchEventType, NewMatchEvent } from '../api/types'

export const eventTypeLabels: Record<MatchEventType, string> = {
  Goal: 'Гол',
  OwnGoal: 'Автогол',
  YellowCard: 'Жёлтая карточка',
  RedCard: 'Красная карточка',
  Substitution: 'Замена',
  EventVoided: 'Отмена события',
  MatchStarted: 'Начало матча',
  MatchPaused: 'Пауза',
  MatchResumed: 'Игра продолжена',
  PeriodStarted: 'Начало периода',
  MatchFinished: 'Финальный свисток',
  Shot: 'Удар',
  ShotOnTarget: 'Удар в створ',
  Foul: 'Фол',
  Corner: 'Угловой',
}

export const isLifecycleEvent = (type: MatchEventType): boolean =>
  type === 'MatchStarted' ||
  type === 'MatchPaused' ||
  type === 'MatchResumed' ||
  type === 'PeriodStarted' ||
  type === 'MatchFinished'

/** Удары, фолы и угловые ведёт статистик: на счёт и статус не влияют. */
export const isStatisticEvent = (type: MatchEventType): boolean =>
  type === 'Shot' || type === 'ShotOnTarget' || type === 'Foul' || type === 'Corner'

/**
 * Протокол для судьи: без событий статистика и без их отмен — это не его записи,
 * и отменить их судья всё равно не должен.
 */
export function refereeProtocol(events: MatchEvent[]): MatchEvent[] {
  const statisticIds = new Set(events.filter((event) => isStatisticEvent(event.type)).map((event) => event.id))

  return events.filter(
    (event) =>
      !statisticIds.has(event.id) &&
      !(event.type === 'EventVoided' && event.targetEventId !== null && statisticIds.has(event.targetEventId)),
  )
}

/**
 * Статус матча с учётом ещё не отправленных событий: судья видит результат своего действия сразу.
 * Правила те же, что в домене сервера (`Match.ApplyLifecycle`); недопустимый переход пропускается,
 * его отклонит сервер. Время устройства приводится к часам сервера.
 */
export function projectMatch(match: Match, pending: NewMatchEvent[], clockOffsetMs: number): Match {
  const lifecycle = pending
    .filter((event) => isLifecycleEvent(event.type))
    .sort((left, right) => left.sequenceNumber - right.sequenceNumber)

  return lifecycle.reduce<Match>((current, event) => {
    const at = new Date(new Date(event.clientTimestampUtc).getTime() + clockOffsetMs).toISOString()
    const isRunning = current.status === 'InProgress' || current.status === 'Pause'

    switch (event.type) {
      case 'MatchStarted':
        return current.status === 'Scheduled'
          ? { ...current, status: 'InProgress', startedAtUtc: at, currentPeriod: 1, periodStartedAtUtc: at }
          : current

      case 'MatchPaused':
        return current.status === 'InProgress' ? { ...current, status: 'Pause', pausedAtUtc: at } : current

      case 'MatchResumed': {
        if (current.status !== 'Pause') return current

        const paused = current.pausedAtUtc
          ? Math.max(0, new Date(at).getTime() - new Date(current.pausedAtUtc).getTime())
          : 0

        return {
          ...current,
          status: 'InProgress',
          pausedAtUtc: null,
          periodPausedMilliseconds: current.periodPausedMilliseconds + paused,
        }
      }

      case 'PeriodStarted':
        return isRunning && current.currentPeriod < current.periodsCount
          ? {
              ...current,
              currentPeriod: current.currentPeriod + 1,
              periodStartedAtUtc: at,
              periodPausedMilliseconds: 0,
              pausedAtUtc: current.status === 'Pause' ? at : null,
            }
          : current

      case 'MatchFinished':
        return current.status === 'InProgress' ? { ...current, status: 'Finished', finishedAtUtc: at } : current

      default:
        return current
    }
  }, match)
}

/** Номер периода для строк «Начало периода» в протоколе: первый период начинается с началом матча. */
export function periodNumbers(events: MatchEvent[]): Map<string, number> {
  const numbers = new Map<string, number>()
  let period = 1

  for (const event of events) {
    if (event.type === 'PeriodStarted') {
      period += 1
      numbers.set(event.id, period)
    }
  }

  return numbers
}

/**
 * UUID v4 для клиентского идентификатора события.
 * Криптостойкость не нужна — важно лишь не повторить Id, поэтому Math.random достаточно.
 */
export function createEventId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

/** Локальное представление ещё не отправленного события — для оптимистичного UI. */
export function toLocalEvent(event: NewMatchEvent, matchId: string): MatchEvent {
  return {
    id: event.id,
    matchId,
    type: event.type,
    teamId: event.teamId ?? null,
    playerId: event.playerId ?? null,
    relatedPlayerId: event.relatedPlayerId ?? null,
    targetEventId: event.targetEventId ?? null,
    reason: event.reason ?? null,
    clientTimestampUtc: event.clientTimestampUtc,
    occurredAtUtc: event.clientTimestampUtc,
    reviewNote: null,
    sequenceNumber: event.sequenceNumber,
    createdAtUtc: new Date().toISOString(),
    isVoided: false,
  }
}

/** События сервера + очередь устройства, с проставленной пометкой отмены. */
export function mergeEvents(
  serverEvents: MatchEvent[],
  pending: NewMatchEvent[],
  matchId: string,
): MatchEvent[] {
  // Сервер уже принял событие, а очередь ещё не обновилась: показываем его один раз.
  const serverIds = new Set(serverEvents.map((event) => event.id))
  const local = pending.filter((event) => !serverIds.has(event.id))
  const all = [...serverEvents, ...local.map((event) => toLocalEvent(event, matchId))]

  const voidedEventIds = new Set(
    all
      .filter((event) => event.type === 'EventVoided' && event.targetEventId)
      .map((event) => event.targetEventId as string),
  )

  return all
    .map((event) => ({ ...event, isVoided: voidedEventIds.has(event.id) }))
    .sort((left, right) => left.sequenceNumber - right.sequenceNumber)
}

/**
 * Счёт — проекция протокола. Считаем на клиенте по тем же правилам, что и сервер,
 * чтобы только что отмеченный гол был виден сразу, до синхронизации.
 */
export function computeScore(match: Match, events: MatchEvent[]): { home: number; away: number } {
  const voidedEventIds = new Set(
    events
      .filter((event) => event.type === 'EventVoided' && event.targetEventId)
      .map((event) => event.targetEventId as string),
  )

  let home = 0
  let away = 0

  for (const event of events) {
    if (voidedEventIds.has(event.id)) continue

    if (event.type === 'Goal' && event.teamId === match.homeTeamId) home += 1
    else if (event.type === 'Goal' && event.teamId === match.awayTeamId) away += 1
    else if (event.type === 'OwnGoal' && event.teamId === match.homeTeamId) away += 1
    else if (event.type === 'OwnGoal' && event.teamId === match.awayTeamId) home += 1
  }

  return { home, away }
}

export function formatEventTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
