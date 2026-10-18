import type { Match, MatchEvent, MatchEventType, NewMatchEvent } from '../api/types'

export const eventTypeLabels: Record<MatchEventType, string> = {
  Goal: 'Гол',
  OwnGoal: 'Автогол',
  YellowCard: 'Жёлтая карточка',
  RedCard: 'Красная карточка',
  Substitution: 'Замена',
  EventVoided: 'Отмена события',
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
  const all = [...serverEvents, ...pending.map((event) => toLocalEvent(event, matchId))]

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
