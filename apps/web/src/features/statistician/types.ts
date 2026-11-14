import type { MatchStatus } from '@/features/matches/types'

/** Матч из списка «Мои матчи» (общий эндпоинт назначенных матчей судьи и статистика). */
export interface AssignedMatch {
  id: string
  stageId: string
  stageName: string
  homeTeamId: string
  homeTeamName: string
  awayTeamId: string
  awayTeamName: string
  status: MatchStatus
  homeScore: number
  awayScore: number
  currentPeriod: number
  periodsCount: number
  scheduledTimeUtc: string
  startedAtUtc: string | null
}

/** События, которые отмечает статистик. Удар в створ — тоже удар. */
export type StatType = 'Shot' | 'ShotOnTarget' | 'Foul' | 'Corner'

export type MatchEventType =
  | StatType
  | 'Goal'
  | 'OwnGoal'
  | 'YellowCard'
  | 'RedCard'
  | 'Substitution'
  | 'EventVoided'
  | 'MatchStarted'
  | 'MatchPaused'
  | 'MatchResumed'
  | 'PeriodStarted'
  | 'MatchFinished'

export interface MatchEvent {
  id: string
  type: MatchEventType
  teamId: string | null
  targetEventId: string | null
  sequenceNumber: number
  isVoided: boolean
  /** xG удара; у остальных событий — null. */
  expectedGoals: number | null
}

export interface StateMatch {
  id: string
  homeTeamId: string
  awayTeamId: string
  status: MatchStatus
  homeScore: number
  awayScore: number
  currentPeriod: number
  periodsCount: number
}

export interface MatchState {
  match: StateMatch
  events: MatchEvent[]
}

/** Событие в очереди браузера: Id и номер назначает клиент, сервер идемпотентен по Id. */
export interface NewMatchEvent {
  id: string
  type: StatType | 'EventVoided'
  teamId: string | null
  targetEventId: string | null
  reason: string | null
  clientTimestampUtc: string
  sequenceNumber: number
  /** xG удара — обязателен у Shot/ShotOnTarget, у остального null. */
  expectedGoals: number | null
}

export interface AppendEventsResult {
  acceptedEventIds: string[]
  duplicateEventIds: string[]
  rejectedEvents: { eventId: string; reason: string }[]
  state: MatchState
}

export interface TeamStats {
  shots: number
  shotsOnTarget: number
  fouls: number
  corners: number
  /** Сумма xG ударов команды. */
  expectedGoals: number
}
