export type MatchStatus = 'Scheduled' | 'InProgress' | 'Pause' | 'Finished' | 'Cancelled'

export interface Match {
  id: string
  /** Короткий сквозной номер (1, 2, 3…) — для ссылки на оверлей трансляции. */
  number: number
  stageId: string
  homeTeamId: string
  awayTeamId: string
  scheduledTimeUtc: string
  startedAtUtc: string | null
  status: MatchStatus
  homeScore: number
  awayScore: number
  /** Сколько событий принято с пометкой и ждут разбора организатором. */
  eventsForReview: number
}

export interface CreateMatchBody {
  stageId: string
  homeTeamId: string
  awayTeamId: string
  startTimeUtc: string
}

export type UpdateMatchBody = Omit<CreateMatchBody, 'stageId'>

/** Тип события протокола (как на сервере). */
export type ProtocolEventType =
  | 'Goal'
  | 'OwnGoal'
  | 'YellowCard'
  | 'RedCard'
  | 'Substitution'
  | 'PenaltyMissed'
  | 'EventVoided'
  | 'MatchStarted'
  | 'MatchPaused'
  | 'MatchResumed'
  | 'PeriodStarted'
  | 'MatchFinished'
  | 'Shot'
  | 'ShotOnTarget'
  | 'Foul'
  | 'Corner'

export type GoalKind = 'Regular' | 'Penalty' | 'Bonus'

/** Событие протокола из `GET /matches/{id}/state`. */
export interface ProtocolEvent {
  id: string
  type: ProtocolEventType
  teamId: string | null
  /** Автор гола, получивший карточку, уходящий с поля, бьющий пенальти. */
  playerId: string | null
  /** Ассистент гола или выходящий на замену. */
  relatedPlayerId: string | null
  targetEventId: string | null
  reason: string | null
  clientTimestampUtc: string
  /** Время с поправкой на часы устройства; у старых событий пусто. */
  occurredAtUtc: string | null
  /** Пометка для организатора: дисквалифицированный или не заявленный игрок. */
  reviewNote: string | null
  sequenceNumber: number
  isVoided: boolean
  goalKind: GoalKind | null
}

/** Матч в составе полного состояния (правила этапа сняты в матч при создании). */
export interface ProtocolMatch extends Match {
  status: MatchStatus
  periodsCount: number
  currentPeriod: number
  bonusGoalEnabled: boolean
  finishedAtUtc: string | null
}

export interface MatchState {
  match: ProtocolMatch
  events: ProtocolEvent[]
}

/** Событие, которое организатор добавляет в протокол (Id и номер назначает клиент). */
export interface NewProtocolEvent {
  id: string
  type: ProtocolEventType
  teamId: string | null
  playerId: string | null
  relatedPlayerId: string | null
  targetEventId: string | null
  reason: string | null
  clientTimestampUtc: string
  sequenceNumber: number
  goalKind: GoalKind | null
}

export interface AppendEventsResult {
  acceptedEventIds: string[]
  duplicateEventIds: string[]
  rejectedEvents: { eventId: string; reason: string }[]
  state: MatchState
}
