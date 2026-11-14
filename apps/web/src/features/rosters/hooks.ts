import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { rostersApi } from './api'

export const rosterKeys = {
  all: ['rosters'] as const,
  teams: (stageId: string) => [...rosterKeys.all, 'teams', stageId] as const,
  team: (stageId: string, tournamentTeamId: string) =>
    [...rosterKeys.all, 'team', stageId, tournamentTeamId] as const,
  sources: (divisionId: string, teamId: string) => [...rosterKeys.all, 'sources', divisionId, teamId] as const,
}

/** Прошлые заявки команды, из которых можно скопировать состав, новые первыми. */
export const rosterSourcesQuery = (divisionId: string, teamId: string) => ({
  queryKey: rosterKeys.sources(divisionId, teamId),
  queryFn: () => rostersApi.listRosterSources(divisionId, teamId),
})

export const useRosterSources = (divisionId: string, teamId: string) => useQuery(rosterSourcesQuery(divisionId, teamId))

/**
 * Команды дивизиона, в который входит этап. Заявка одна на дивизион, поэтому у всех его этапов
 * список одинаковый; читаем по этапу — экраны этапа знают только его.
 */
export const useTournamentTeams = (stageId: string) =>
  useQuery({
    queryKey: rosterKeys.teams(stageId),
    queryFn: () => rostersApi.listTeams(stageId),
    enabled: Boolean(stageId),
  })

export const useTournamentTeam = (stageId: string, tournamentTeamId: string) =>
  useQuery({
    queryKey: rosterKeys.team(stageId, tournamentTeamId),
    queryFn: () => rostersApi.getTeam(stageId, tournamentTeamId),
    enabled: Boolean(stageId && tournamentTeamId),
  })

/** Участники нескольких этапов сразу (например, все команды турнира). */
export const useTournamentTeamsForStages = (stageIds: string[]) =>
  useQueries({
    queries: stageIds.map((stageId) => ({
      queryKey: rosterKeys.teams(stageId),
      queryFn: () => rostersApi.listTeams(stageId),
    })),
  })

/**
 * Любое изменение заявок инвалидирует и список участников, и карточку команды.
 * Изменения идут по дивизиону заявки (divisionId), чтение — по этапу.
 */
function useRosterMutation<TVariables, TResult = unknown>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rosterKeys.all }),
  })
}

export const useAddTournamentTeam = (divisionId: string) =>
  useRosterMutation((input: { teamId: string; copyFrom: string | null }) =>
    rostersApi.addTeam(divisionId, input.teamId, input.copyFrom),
  )

export const useWithdrawTournamentTeam = (divisionId: string, tournamentTeamId: string) =>
  useRosterMutation(() => rostersApi.withdrawTeam(divisionId, tournamentTeamId))

export const useRegisterPlayer = (divisionId: string, tournamentTeamId: string) =>
  useRosterMutation((playerId: string) => rostersApi.registerPlayer(divisionId, tournamentTeamId, playerId))

export const useReleasePlayer = (divisionId: string, tournamentTeamId: string) =>
  useRosterMutation((registrationId: string) =>
    rostersApi.releasePlayer(divisionId, tournamentTeamId, registrationId),
  )

export const useTransferPlayer = (
  divisionId: string,
  fromTeamId: string,
) =>
  useRosterMutation((input: { playerId: string; toTeamId: string }) =>
    rostersApi.transferPlayer(divisionId, {
      playerId: input.playerId,
      fromTeamId,
      toTeamId: input.toTeamId,
    }),
  )

export const useDeleteRegistration = (divisionId: string, tournamentTeamId: string) =>
  useRosterMutation((registrationId: string) =>
    rostersApi.deleteRegistration(divisionId, tournamentTeamId, registrationId),
  )

// Удалённую заявку команды убираем из кэша, а не перезапрашиваем: иначе открытая карточка мигнёт 404.
// Карточка могла быть открыта из любого этапа дивизиона — убираем её под всеми ключами.
export const useDeleteTournamentTeam = (divisionId: string, tournamentTeamId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => rostersApi.deleteTeam(divisionId, tournamentTeamId),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: rosterKeys.all,
        predicate: (query) => query.queryKey[1] === 'team' && query.queryKey[3] === tournamentTeamId,
      })
      return queryClient.invalidateQueries({ queryKey: [...rosterKeys.all, 'teams'] })
    },
  })
}
