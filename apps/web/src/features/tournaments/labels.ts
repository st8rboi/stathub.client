import type { BadgeTone } from '@/shared/ui/layout'
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

export const tournamentStatusTones: Record<TournamentStatus, BadgeTone> = {
  Scheduled: 'info',
  Active: 'success',
  Completed: 'neutral',
  Cancelled: 'danger',
}
