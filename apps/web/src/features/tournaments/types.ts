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

/** Группа кругового этапа: часть команд дивизиона со своей таблицей. */
export interface StageGroup {
  id: string
  order: number
  name: string
  teamIds: string[]
}

export interface Stage {
  id: string
  divisionId: string
  /** Порядок этапа внутри дивизиона. */
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
  /** Сколько первых команд выходит дальше (при группах — из каждой); null — никто. */
  qualifiersCount: number | null
  groups: StageGroup[]
}

/**
 * Дивизион — независимое соревнование внутри турнира: свои заявки команд и своя статистика игроков.
 * Он есть всегда; пока он один, интерфейс его не показывает.
 */
export interface Division {
  id: string
  order: number
  name: string
  stages: Stage[]
}

export interface Tournament extends TournamentSummary {
  /** Все этапы плоским списком (порядок: дивизион, затем этап). */
  stages: Stage[]
  divisions: Division[]
}

export interface CreateTournamentBody {
  name: string
  startDate: string
  endDate: string | null
}

export type StageBody = Omit<Stage, 'id' | 'order' | 'divisionId' | 'groups'>

/** Дивизион можно не указывать, пока он в турнире один. */
export type AddStageBody = StageBody & { divisionId?: string }

export interface StageGroupBody {
  name: string
  teamIds: string[]
}

export type UpdateTournamentBody = CreateTournamentBody
