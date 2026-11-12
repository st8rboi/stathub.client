import type { BadgeTone } from '@/shared/ui/layout'
import type { Stage, StageFormatType, Tournament, TournamentStatus } from './types'

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

/** Дивизион этапа — только если дивизионов в турнире несколько: единственный не показываем. */
export function stageDivisionName(tournament: Tournament, stage: Stage): string | null {
  if (tournament.divisions.length < 2) return null
  return tournament.divisions.find((division) => division.id === stage.divisionId)?.name ?? null
}

/**
 * Короткое имя этапа там, где нет места для двух уровней (хлебные крошки, выпадающие списки).
 * Единственный этап дивизиона называем именем дивизиона: «Первый дивизион», а не «Основной этап».
 */
export function stageDisplayName(tournament: Tournament, stage: Stage): string {
  const divisionName = stageDivisionName(tournament, stage)
  if (!divisionName) return stage.name
  const siblings = tournament.stages.filter((item) => item.divisionId === stage.divisionId).length
  return siblings > 1 ? `${divisionName} · ${stage.name}` : divisionName
}
