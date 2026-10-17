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
 * Заявки команд на турнир. Нужны судье, чтобы выбрать автора гола: событие хранит
 * идентификатор игрока, а состав привязан к турниру, а не к матчу.
 */
export const rostersApi = {
  listTeams: (tournamentId: string) =>
    request<TournamentTeam[]>('GET', `/tournaments/${tournamentId}/teams`),
  getTeam: (tournamentId: string, tournamentTeamId: string) =>
    request<TournamentTeamDetails>('GET', `/tournaments/${tournamentId}/teams/${tournamentTeamId}`),
}
