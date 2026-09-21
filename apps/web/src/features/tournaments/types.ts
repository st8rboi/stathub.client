export type TournamentStatus = 'Scheduled' | 'Active' | 'Completed' | 'Cancelled'
export type StageFormatType = 'Round' | 'Playoff'
export type TournamentAction = 'start' | 'complete' | 'cancel'

export interface TournamentSummary {
  id: string
  leagueId: string
  name: string
  startDate: string
  endDate: string | null
  status: TournamentStatus
}

export interface Stage {
  id: string
  order: number
  name: string
  formatType: StageFormatType
  winPoints: number
  drawPoints: number
  lossPoints: number
  periodDurationMinutes: number
  periodsCount: number
  extraTimeEnabled: boolean
  penaltyShootoutEnabled: boolean
}

export interface Tournament extends TournamentSummary {
  stages: Stage[]
}

export interface CreateTournamentBody {
  name: string
  startDate: string
  endDate: string | null
}

export type AddStageBody = Omit<Stage, 'id' | 'order'>
