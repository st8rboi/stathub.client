import type { MatchEvent, NewMatchEvent, StatType, StateMatch, TeamStats } from './types'

export const statButtons: { type: StatType; label: string; key: keyof TeamStats }[] = [
  { type: 'Shot', label: 'Удар', key: 'shots' },
  { type: 'ShotOnTarget', label: 'В створ', key: 'shotsOnTarget' },
  { type: 'Foul', label: 'Фол', key: 'fouls' },
  { type: 'Corner', label: 'Угловой', key: 'corners' },
]

export const statLabels: Record<StatType, string> = {
  Shot: 'Удар',
  ShotOnTarget: 'Удар в створ',
  Foul: 'Фол',
  Corner: 'Угловой',
}

export const isStatType = (type: string): type is StatType =>
  type === 'Shot' || type === 'ShotOnTarget' || type === 'Foul' || type === 'Corner'

type CountedEvent = Pick<MatchEvent, 'id' | 'type' | 'teamId' | 'targetEventId'>

/** События сервера + очередь браузера, без повторов: принятое сервером событие считается один раз. */
export function mergeEvents(serverEvents: MatchEvent[], pending: NewMatchEvent[]): CountedEvent[] {
  const serverIds = new Set(serverEvents.map((event) => event.id))
  return [...serverEvents, ...pending.filter((event) => !serverIds.has(event.id))]
}

export function voidedIds(events: CountedEvent[]): Set<string> {
  return new Set(
    events
      .filter((event) => event.type === 'EventVoided' && event.targetEventId)
      .map((event) => event.targetEventId as string),
  )
}

const empty = (): TeamStats => ({ shots: 0, shotsOnTarget: 0, fouls: 0, corners: 0 })

/**
 * Счётчики по командам — те же правила, что на сервере (`MatchStatistics.Compute`): отменённые
 * не считаются, удар в створ входит и в «Удары». Считаем на клиенте, чтобы нажатие было видно сразу.
 */
export function computeStats(match: StateMatch, events: CountedEvent[]): { home: TeamStats; away: TeamStats } {
  const voided = voidedIds(events)
  const home = empty()
  const away = empty()

  for (const event of events) {
    if (!isStatType(event.type) || voided.has(event.id)) continue

    const side = event.teamId === match.homeTeamId ? home : event.teamId === match.awayTeamId ? away : null
    if (!side) continue

    if (event.type === 'Shot') side.shots += 1
    if (event.type === 'ShotOnTarget') {
      side.shots += 1
      side.shotsOnTarget += 1
    }
    if (event.type === 'Foul') side.fouls += 1
    if (event.type === 'Corner') side.corners += 1
  }

  return { home, away }
}
