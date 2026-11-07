import { request } from '@/shared/api/client'
import type { TournamentTeam, TournamentTeamDetails } from './types'

export const rostersApi = {
  listTeams: (stageId: string) => request<TournamentTeam[]>('GET', `/stages/${stageId}/teams`),
  getTeam: (stageId: string, tournamentTeamId: string) =>
    request<TournamentTeamDetails>('GET', `/stages/${stageId}/teams/${tournamentTeamId}`),
  addTeam: (stageId: string, teamId: string) =>
    request<{ id: string }>('POST', `/stages/${stageId}/teams`, { teamId }),
  registerPlayer: (stageId: string, tournamentTeamId: string, playerId: string, squadNumber: number | null) =>
    request<{ id: string }>('POST', `/stages/${stageId}/teams/${tournamentTeamId}/players`, {
      playerId,
      squadNumber,
    }),
  releasePlayer: (stageId: string, tournamentTeamId: string, registrationId: string) =>
    request<void>(
      'POST',
      `/stages/${stageId}/teams/${tournamentTeamId}/players/${registrationId}/release`,
    ),
  transferPlayer: (
    stageId: string,
    body: { playerId: string; fromTeamId: string; toTeamId: string; squadNumber: number | null },
  ) => request<void>('POST', `/stages/${stageId}/transfers`, body),
  withdrawTeam: (stageId: string, tournamentTeamId: string) =>
    request<void>('POST', `/stages/${stageId}/teams/${tournamentTeamId}/withdraw`),
}
