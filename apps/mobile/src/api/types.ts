/**
 * Контракты модуля Matches (`stathub.server/src/Modules/Stathub.Modules.Matches`).
 * Enum'ы на сервере сериализуются строками (`JsonStringEnumConverter`).
 */
export type MatchStatus = 'Scheduled' | 'InProgress' | 'Pause' | 'Finished' | 'Cancelled'

export type Match = {
  id: string
  stageId: string
  /** Турнир (сезон) этапа: по нему клиент находит заявки команд и составы. */
  tournamentId: string
  homeTeamId: string
  awayTeamId: string
  createdAtUtc: string
  scheduledTimeUtc: string
  startedAtUtc: string | null
  status: MatchStatus
  homeScore: number
  awayScore: number
  periodsCount: number
  periodDurationMinutes: number
  extraTimeEnabled: boolean
  penaltyShootoutEnabled: boolean
  /** 0 — матч ещё не начат */
  currentPeriod: number
  periodStartedAtUtc: string | null
}

export type CreateMatchRequest = {
  stageId: string
  homeTeamId: string
  awayTeamId: string
  startTimeUtc: string
}

/** Типы событий протокола: отмена — отдельное событие со ссылкой на отменяемое. */
export type MatchEventType =
  | 'Goal'
  | 'OwnGoal'
  | 'YellowCard'
  | 'RedCard'
  | 'Substitution'
  | 'EventVoided'

export type MatchEvent = {
  id: string
  matchId: string
  type: MatchEventType
  teamId: string | null
  playerId: string | null
  relatedPlayerId: string | null
  targetEventId: string | null
  reason: string | null
  clientTimestampUtc: string
  sequenceNumber: number
  createdAtUtc: string
  isVoided: boolean
}

/** Полное состояние матча: матч (со счётом-проекцией) и протокол. */
export type MatchState = {
  match: Match
  events: MatchEvent[]
}

/** Событие, которое клиент кладёт в офлайн-очередь: id и sequenceNumber назначает он сам. */
export type NewMatchEvent = {
  id: string
  type: MatchEventType
  teamId?: string | null
  playerId?: string | null
  relatedPlayerId?: string | null
  targetEventId?: string | null
  reason?: string | null
  clientTimestampUtc: string
  sequenceNumber: number
}

export type AppendEventsResult = {
  acceptedEventIds: string[]
  duplicateEventIds: string[]
  state: MatchState
}

export type Team = {
  id: string
  name: string
  city: string | null
  createdAtUtc: string
}

export type Player = {
  id: string
  fullName: string
  birthDate: string | null
  createdAtUtc: string
}

export type TournamentTeam = {
  id: string
  tournamentId: string
  teamId: string
  status: 'Active' | 'Withdrawn'
  activePlayers: number
  createdAtUtc: string
}

export type PlayerRegistration = {
  id: string
  playerId: string
  squadNumber: number | null
  status: 'Active' | 'TransferredOut' | 'Released'
  joinedOn: string
  leftOn: string | null
}

export type TournamentTeamDetails = {
  id: string
  tournamentId: string
  teamId: string
  status: 'Active' | 'Withdrawn'
  registrations: PlayerRegistration[]
}
