/**
 * Контракты модуля Matches (`stathub.server/src/Modules/Stathub.Modules.Matches`).
 * Enum'ы на сервере сериализуются строками (`JsonStringEnumConverter`).
 */
export type MatchStatus = 'Scheduled' | 'InProgress' | 'Pause' | 'Finished' | 'Cancelled'

export type Match = {
  id: string
  stageId: string
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
