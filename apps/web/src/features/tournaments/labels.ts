import type { StageFormatType, TournamentStatus } from './types'

export const tournamentStatusLabels: Record<TournamentStatus, string> = {
  Scheduled: 'Запланирован',
  Active: 'Идёт',
  Completed: 'Завершён',
  Cancelled: 'Отменён',
}

export const stageFormatLabels: Record<StageFormatType, string> = {
  Round: 'Круговая (каждый с каждым)',
  Playoff: 'Плей-офф',
}
