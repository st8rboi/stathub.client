export type StandingsRow = {
  teamId: string
  teamName: string
  teamLogoUrl: string | null
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  /** Место в своей таблице (в группе — внутри группы). */
  position: number
  /** Команда в зоне выхода в следующий этап. */
  qualifies: boolean
}

/** Таблица одной группы кругового этапа. */
export type StandingsGroup = {
  groupId: string
  name: string
  rows: StandingsRow[]
}

export type PublicLeague = {
  id: string
  name: string
  slug: string
  sport: string
  city: string | null
  region: string | null
  logoUrl: string | null
  dataSource: string
}

export type PublicStageSummary = {
  id: string
  order: number
  name: string
  formatType: string
  divisionId: string
}

/** Дивизион турнира — независимое соревнование со своими командами, таблицей и статистикой. */
export type PublicDivision = {
  id: string
  order: number
  name: string
  stages: PublicStageSummary[]
}

export type PublicTournament = {
  id: string
  name: string
  startDate: string
  endDate: string | null
  status: string
  /** Все этапы плоским списком. */
  stages: PublicStageSummary[]
  /** Дерево «дивизион → этапы». Один дивизион на витрине не показываем. */
  divisions: PublicDivision[]
}

export type PublicLeaguePage = {
  league: PublicLeague
  tournaments: PublicTournament[]
}

export type PublicStage = {
  id: string
  name: string
  order: number
  formatType: string
  tournamentName: string
  tournamentId: string
  leagueName: string
  leagueSlug: string
  leagueLogoUrl: string | null
  winPoints: number
  drawPoints: number
  lossPoints: number
  divisionId: string
  divisionName: string
  /** Сколько дивизионов в турнире: при одном уровень дивизиона скрыт. */
  divisionsCount: number
  /** Сколько первых команд выходит дальше (при группах — из каждой); null — никто. */
  qualifiersCount: number | null
}

/** День с матчами в часовом поясе зрителя: `date` — «YYYY-MM-DD». */
export type PublicMatchDay = {
  date: string
  count: number
}

export type PublicMatch = {
  id: string
  stageId: string
  stageName: string
  tournamentName: string
  leagueName: string
  leagueSlug: string
  leagueLogoUrl: string | null
  homeTeamId: string
  homeTeamName: string
  homeTeamLogoUrl: string | null
  awayTeamId: string
  awayTeamName: string
  awayTeamLogoUrl: string | null
  status: string
  homeScore: number
  awayScore: number
  currentPeriod: number
  periodsCount: number
  scheduledTimeUtc: string
  startedAtUtc: string | null
  periodStartedAtUtc: string | null
  pausedAtUtc: string | null
  periodPausedMilliseconds: number
  /** Длительность периода по регламенту; нужна, чтобы считать минуту как на флешскоре (2-й тайм с 46'). */
  periodDurationMinutes?: number
  /** Дивизион матча; null, если дивизион в турнире один. */
  divisionName?: string | null
}

export type PublicEvent = {
  id: string
  type: string
  teamName: string | null
  playerName: string | null
  occurredAtUtc: string
  isVoided: boolean
  reason: string | null
  // Поля ниже сервер может ещё не отдавать — клиент работает и без них.
  teamId?: string | null
  /** Ассистент гола или выходящий на замену. */
  relatedPlayerName?: string | null
  /** Для EventVoided — какое событие отменено. */
  targetEventId?: string | null
  /** Период и игровые секунды от его начала без учёта пауз. */
  period?: number | null
  elapsedSeconds?: number | null
}

export type PublicMatchPage = {
  match: PublicMatch
  events: PublicEvent[]
}

export type PublicStagePage = {
  stage: PublicStage
  matches: PublicMatch[]
  standings: StandingsRow[]
  /** Заполнен у группового этапа; тогда standings — те же строки подряд. */
  standingsGroups: StandingsGroup[]
  /** Этапы того же дивизиона — переключатель «круг / плей-офф». */
  divisionStages: PublicStageSummary[]
}

export type PlayerStatisticsRow = {
  playerId: string
  playerName: string
  teamId: string | null
  teamName: string | null
  teamLogoUrl: string | null
  matches: number
  goals: number
  assists: number
  ownGoals: number
  yellowCards: number
  redCards: number
}

export type PublicTournamentHeader = {
  id: string
  name: string
  leagueName: string
  leagueSlug: string
  leagueLogoUrl: string | null
}

/** Статистика игроков одного дивизиона турнира; divisions — все дивизионы для переключателя. */
export type TournamentStatistics = {
  tournament: PublicTournamentHeader
  rows: PlayerStatisticsRow[]
  divisionId: string | null
  divisions: { id: string; name: string; order: number }[]
}

export type PublicTeam = {
  id: string
  name: string
  city: string | null
  logoUrl: string | null
}

/** Участие команды в этапе опубликованной лиги. status — заявка (Active/Withdrawn) или null. */
export type PublicTeamParticipation = {
  stageId: string
  stageName: string
  tournamentId: string
  tournamentName: string
  leagueName: string
  leagueSlug: string
  leagueLogoUrl: string | null
  status: string | null
  divisionId: string
  /** null, если дивизион в турнире один. */
  divisionName: string | null
}

/** Игрок заявки со статистикой за матчи команды во всех этапах дивизиона. */
export type PublicTeamPlayer = {
  playerId: string
  fullName: string
  photoUrl: string | null
  birthDate: string | null
  /** Active | TransferredOut | Released */
  status: string
  joinedOn: string
  leftOn: string | null
  matches: number
  goals: number
  assists: number
  ownGoals: number
  yellowCards: number
  redCards: number
}

export type PublicTeamPage = {
  team: PublicTeam
  participations: PublicTeamParticipation[]
  stage: PublicStage
  matches: PublicMatch[]
  standings: StandingsRow[]
  players: PublicTeamPlayer[]
  standingsGroups: StandingsGroup[]
}
