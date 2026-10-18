import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rostersApi } from './api'

export const rosterKeys = {
  all: ['rosters'] as const,
  teams: (tournamentId: string) => [...rosterKeys.all, 'teams', tournamentId] as const,
  team: (tournamentId: string, tournamentTeamId: string) =>
    [...rosterKeys.all, 'team', tournamentId, tournamentTeamId] as const,
}

export const useTournamentTeams = (tournamentId: string) =>
  useQuery({
    queryKey: rosterKeys.teams(tournamentId),
    queryFn: () => rostersApi.listTeams(tournamentId),
    enabled: Boolean(tournamentId),
  })

export const useTournamentTeam = (tournamentId: string, tournamentTeamId: string) =>
  useQuery({
    queryKey: rosterKeys.team(tournamentId, tournamentTeamId),
    queryFn: () => rostersApi.getTeam(tournamentId, tournamentTeamId),
    enabled: Boolean(tournamentId && tournamentTeamId),
  })

/** Любое изменение заявок инвалидирует и список участников, и карточку команды. */
function useRosterMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rosterKeys.all }),
  })
}

export const useAddTournamentTeam = (tournamentId: string) =>
  useRosterMutation((teamId: string) => rostersApi.addTeam(tournamentId, teamId))

export const useWithdrawTournamentTeam = (tournamentId: string, tournamentTeamId: string) =>
  useRosterMutation(() => rostersApi.withdrawTeam(tournamentId, tournamentTeamId))

export const useRegisterPlayer = (tournamentId: string, tournamentTeamId: string) =>
  useRosterMutation((input: { playerId: string; squadNumber: number | null }) =>
    rostersApi.registerPlayer(tournamentId, tournamentTeamId, input.playerId, input.squadNumber),
  )

export const useReleasePlayer = (tournamentId: string, tournamentTeamId: string) =>
  useRosterMutation((registrationId: string) =>
    rostersApi.releasePlayer(tournamentId, tournamentTeamId, registrationId),
  )

export const useTransferPlayer = (
  tournamentId: string,
  fromTeamId: string,
) =>
  useRosterMutation((input: { playerId: string; toTeamId: string; squadNumber: number | null }) =>
    rostersApi.transferPlayer(tournamentId, {
      playerId: input.playerId,
      fromTeamId,
      toTeamId: input.toTeamId,
      squadNumber: input.squadNumber,
    }),
  )
