/**
 * Контракты модуля Matches (`stathub.server/src/Modules/Stathub.Modules.Matches`).
 * Enum'ы на сервере сериализуются строками (`JsonStringEnumConverter`).
 */
export type MatchStatus = 'Scheduled' | 'InProgress' | 'Pause' | 'Finished' | 'Cancelled'

/** Матч из «Мои матчи» судьи: только то, что нужно списку. */
export type RefereeMatch = {
  id: string
  stageId: string
  stageName: string
  tournamentName: string
  leagueName: string
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
  /** Разрешён ли бонусный мяч (гол за два). У матчей из старого кэша поля нет — считаем, что нет. */
  bonusGoalEnabled?: boolean
  /** 0 — матч ещё не начат */
  currentPeriod: number
  periodStartedAtUtc: string | null
  /** Когда остановлена игра; null — часы идут. */
  pausedAtUtc: string | null
  /** Сумма завершённых пауз текущего периода. */
  periodPausedMilliseconds: number
  finishedAtUtc: string | null
  /** Сколько событий ждут разбора организатором. */
  eventsForReview: number
}


/** Типы событий протокола: отмена — отдельное событие со ссылкой на отменяемое. */
export type MatchEventType =
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
  // Командная статистика: отмечает статистик в админке, судье в протоколе не показывается.
  | 'Shot'
  | 'ShotOnTarget'
  | 'Foul'
  | 'Corner'
  // Нереализованный пенальти: на счёт не влияет, нужен для статистики пенальти.
  | 'PenaltyMissed'

/** Вид гола (только у `Goal`): с игры, с пенальти (без ассистента), бонусный (идёт в счёт за два). */
export type GoalKind = 'Regular' | 'Penalty' | 'Bonus'

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
  /** Время с поправкой на расхождение часов устройства и сервера. */
  occurredAtUtc: string
  /** Пометка для организатора: событие принято, но требует разбора. */
  reviewNote: string | null
  sequenceNumber: number
  createdAtUtc: string
  isVoided: boolean
  /** Вид гола; пусто у старых голов и у остальных событий — это гол с игры. */
  goalKind?: GoalKind | null
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
  goalKind?: GoalKind | null
  clientTimestampUtc: string
  sequenceNumber: number
}

export type AppendEventsResult = {
  acceptedEventIds: string[]
  duplicateEventIds: string[]
  rejectedEvents: { eventId: string; reason: string }[]
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
  /** Относительный путь (`/uploads/...`); абсолютный адрес — через resolveMediaUrl. */
  photoUrl: string | null
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
