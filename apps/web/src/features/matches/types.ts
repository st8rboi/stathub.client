export type MatchStatus = 'Scheduled' | 'InProgress' | 'Pause' | 'Finished' | 'Cancelled'

export interface Match {
  id: string
  stageId: string
  homeTeamId: string
  awayTeamId: string
  scheduledTimeUtc: string
  startedAtUtc: string | null
  status: MatchStatus
  homeScore: number
  awayScore: number
}

export interface CreateMatchBody {
  stageId: string
  homeTeamId: string
  awayTeamId: string
  startTimeUtc: string
}
