import type { LeagueDataSource, LeagueStatus } from './types'

export const leagueStatusLabels: Record<LeagueStatus, string> = {
  Draft: 'Черновик',
  Published: 'Опубликована',
  Archived: 'В архиве',
}

export const dataSourceLabels: Record<LeagueDataSource, string> = {
  Native: 'Ведётся на платформе',
  Mirrored: 'Результаты из внешнего источника',
}
