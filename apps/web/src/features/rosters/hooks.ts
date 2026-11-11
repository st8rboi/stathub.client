import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
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

/** Участники нескольких этапов сразу (например, все команды турнира). */
export const useTournamentTeamsForStages = (stageIds: string[]) =>
  useQueries({
    queries: stageIds.map((stageId) => ({
      queryKey: rosterKeys.teams(stageId),
      queryFn: () => rostersApi.listTeams(stageId),
    })),
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
  useRosterMutation((playerId: string) => rostersApi.registerPlayer(tournamentId, tournamentTeamId, playerId))

export const useReleasePlayer = (tournamentId: string, tournamentTeamId: string) =>
  useRosterMutation((registrationId: string) =>
    rostersApi.releasePlayer(tournamentId, tournamentTeamId, registrationId),
  )

export const useTransferPlayer = (
  tournamentId: string,
  fromTeamId: string,
) =>
  useRosterMutation((input: { playerId: string; toTeamId: string }) =>
    rostersApi.transferPlayer(tournamentId, {
      playerId: input.playerId,
      fromTeamId,
      toTeamId: input.toTeamId,
    }),
  )

export const useDeleteRegistration = (stageId: string, tournamentTeamId: string) =>
  useRosterMutation((registrationId: string) =>
    rostersApi.deleteRegistration(stageId, tournamentTeamId, registrationId),
  )

// Удалённую заявку команды убираем из кэша, а не перезапрашиваем: иначе открытая карточка мигнёт 404.
export const useDeleteTournamentTeam = (stageId: string, tournamentTeamId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => rostersApi.deleteTeam(stageId, tournamentTeamId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: rosterKeys.team(stageId, tournamentTeamId) })
      return queryClient.invalidateQueries({ queryKey: rosterKeys.teams(stageId) })
    },
  })
}
