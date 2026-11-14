import { request } from '@/shared/api/client'
import type { AddTournamentTeamResult, RosterSource, TournamentTeam, TournamentTeamDetails } from './types'

/**
 * Заявки принадлежат дивизиону: команда заявляется один раз и играет во всех его этапах.
 * Читать состав можно по этапу (экраны этапа знают только его), менять — только по дивизиону.
 */
export const rostersApi = {
  listTeams: (stageId: string) => request<TournamentTeam[]>('GET', `/stages/${stageId}/teams`),
  getTeam: (stageId: string, tournamentTeamId: string) =>
    request<TournamentTeamDetails>('GET', `/stages/${stageId}/teams/${tournamentTeamId}`),
  /** С `copyFromTournamentTeamId` команда заявляется сразу с составом из другой своей заявки. */
  addTeam: (divisionId: string, teamId: string, copyFromTournamentTeamId: string | null = null) =>
    request<AddTournamentTeamResult>('POST', `/divisions/${divisionId}/teams`, { teamId, copyFromTournamentTeamId }),
  listRosterSources: (divisionId: string, teamId: string) =>
    request<RosterSource[]>('GET', `/divisions/${divisionId}/roster-sources?teamId=${teamId}`),
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
