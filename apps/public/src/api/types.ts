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
}

export type PublicTournament = {
  id: string
  name: string
  startDate: string
  endDate: string | null
  status: string
  stages: PublicStageSummary[]
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
}

export type PublicEvent = {
  id: string
  type: string
  teamName: string | null
  playerName: string | null
  clientTimestampUtc: string
  isVoided: boolean
  reason: string | null
}

export type PublicMatchPage = {
  match: PublicMatch
  events: PublicEvent[]
}

export type PublicStagePage = {
  stage: PublicStage
  matches: PublicMatch[]
  standings: StandingsRow[]
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

export type TournamentStatistics = {
  tournament: PublicTournamentHeader
  rows: PlayerStatisticsRow[]
}
