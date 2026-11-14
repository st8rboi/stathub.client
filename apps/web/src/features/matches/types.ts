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
