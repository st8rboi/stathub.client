import { request } from '@/shared/api/client'
import type { TournamentTeam, TournamentTeamDetails } from './types'

export const rostersApi = {
  listTeams: (tournamentId: string) =>
    request<TournamentTeam[]>('GET', `/tournaments/${tournamentId}/teams`),
  getTeam: (tournamentId: string, tournamentTeamId: string) =>
    request<TournamentTeamDetails>('GET', `/tournaments/${tournamentId}/teams/${tournamentTeamId}`),
  addTeam: (tournamentId: string, teamId: string) =>
    request<{ id: string }>('POST', `/tournaments/${tournamentId}/teams`, { teamId }),
  registerPlayer: (tournamentId: string, tournamentTeamId: string, playerId: string, squadNumber: number | null) =>
    request<{ id: string }>('POST', `/tournaments/${tournamentId}/teams/${tournamentTeamId}/players`, {
      playerId,
      squadNumber,
    }),
  releasePlayer: (tournamentId: string, tournamentTeamId: string, registrationId: string) =>
    request<void>(
      'POST',
      `/tournaments/${tournamentId}/teams/${tournamentTeamId}/players/${registrationId}/release`,
    ),
  transferPlayer: (
    tournamentId: string,
    body: { playerId: string; fromTeamId: string; toTeamId: string; squadNumber: number | null },
  ) => request<void>('POST', `/tournaments/${tournamentId}/transfers`, body),
  withdrawTeam: (tournamentId: string, tournamentTeamId: string) =>
    request<void>('POST', `/tournaments/${tournamentId}/teams/${tournamentTeamId}/withdraw`),
}
