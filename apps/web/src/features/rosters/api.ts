import { request } from '@/shared/api/client'
import type { TournamentTeam, TournamentTeamDetails } from './types'

/**
 * Заявки принадлежат дивизиону: команда заявляется один раз и играет во всех его этапах.
 * Читать состав можно по этапу (экраны этапа знают только его), менять — только по дивизиону.
 */
export const rostersApi = {
  listTeams: (stageId: string) => request<TournamentTeam[]>('GET', `/stages/${stageId}/teams`),
  getTeam: (stageId: string, tournamentTeamId: string) =>
    request<TournamentTeamDetails>('GET', `/stages/${stageId}/teams/${tournamentTeamId}`),
  addTeam: (divisionId: string, teamId: string) =>
    request<{ id: string }>('POST', `/divisions/${divisionId}/teams`, { teamId }),
  registerPlayer: (divisionId: string, tournamentTeamId: string, playerId: string) =>
    request<{ id: string }>('POST', `/divisions/${divisionId}/teams/${tournamentTeamId}/players`, { playerId }),
  releasePlayer: (divisionId: string, tournamentTeamId: string, registrationId: string) =>
    request<void>(
      'POST',
      `/divisions/${divisionId}/teams/${tournamentTeamId}/players/${registrationId}/release`,
    ),
  transferPlayer: (
    divisionId: string,
    body: { playerId: string; fromTeamId: string; toTeamId: string },
  ) => request<void>('POST', `/divisions/${divisionId}/transfers`, body),
  deleteRegistration: (divisionId: string, tournamentTeamId: string, registrationId: string) =>
    request<void>('DELETE', `/divisions/${divisionId}/teams/${tournamentTeamId}/players/${registrationId}`),
  deleteTeam: (divisionId: string, tournamentTeamId: string) =>
    request<void>('DELETE', `/divisions/${divisionId}/teams/${tournamentTeamId}`),
  withdrawTeam: (divisionId: string, tournamentTeamId: string) =>
    request<void>('POST', `/divisions/${divisionId}/teams/${tournamentTeamId}/withdraw`),
}
