import { request } from './client'
import type { Player, Team, TournamentTeam, TournamentTeamDetails } from './types'

export const teamsApi = {
  /** Названия команд по идентификаторам: матч хранит только Id. */
  byIds: (ids: string[]) => request<Team[]>('GET', `/teams?ids=${ids.join(',')}`),
}

export const playersApi = {
  byIds: (ids: string[]) => request<Player[]>('GET', `/players?ids=${ids.join(',')}`),
}

/**
 * Заявки команд на этап (группа/дивизион/плей-офф). Нужны судье, чтобы выбрать автора гола:
 * событие хранит идентификатор игрока, а состав заявлен на дивизион, а не на турнир целиком.
 */
export const rostersApi = {
  listTeams: (stageId: string) => request<TournamentTeam[]>('GET', `/stages/${stageId}/teams`),
  getTeam: (stageId: string, tournamentTeamId: string) =>
    request<TournamentTeamDetails>('GET', `/stages/${stageId}/teams/${tournamentTeamId}`),
}
