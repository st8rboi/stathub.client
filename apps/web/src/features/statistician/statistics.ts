import type { MatchEvent, NewMatchEvent, StatType, StateMatch, TeamStats } from './types'

/** Шкала опасности удара: статистик выбирает уровень, в протокол уходит его xG. */
export const dangerLevels: { label: string; xg: number }[] = [
  { label: 'Совсем не опасно', xg: 0.05 },
  { label: 'Не опасно', xg: 0.15 },
  { label: 'Средне', xg: 0.25 },
  { label: 'Опасно', xg: 0.45 },
  { label: 'Очень опасно', xg: 0.65 },
]

export const isShotType = (type: string): boolean => type === 'Shot' || type === 'ShotOnTarget'

/** xG с двумя знаками: «0.60», как принято на флешскоре. */
export const formatXg = (value: number): string => value.toFixed(2)

export const statButtons: { type: StatType; label: string; key: Exclude<keyof TeamStats, 'expectedGoals'> }[] = [
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

type CountedEvent = Pick<MatchEvent, 'id' | 'type' | 'teamId' | 'targetEventId' | 'expectedGoals'>

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

const empty = (): TeamStats => ({ shots: 0, shotsOnTarget: 0, fouls: 0, corners: 0, expectedGoals: 0 })

/**
 * Счётчики по командам — те же правила, что на сервере (`MatchStatistics.Compute`): отменённые
 * не считаются, удар в створ входит и в «Удары», xG ударов суммируется. Считаем на клиенте,
 * чтобы нажатие было видно сразу.
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
    if (isShotType(event.type)) side.expectedGoals += event.expectedGoals ?? 0
  }

  // Сумма дробей в JS копит погрешность (0.1 + 0.2): округляем до сотых, как на сервере.
  home.expectedGoals = Math.round(home.expectedGoals * 100) / 100
  away.expectedGoals = Math.round(away.expectedGoals * 100) / 100

  return { home, away }
}
