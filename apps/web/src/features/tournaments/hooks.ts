import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tournamentsApi } from './api'
import type {
  AddStageBody,
  CreateTournamentBody,
  StageBody,
  StageGroupBody,
  TournamentAction,
  UpdateTournamentBody,
} from './types'

export const tournamentKeys = {
  all: ['tournaments'] as const,
  list: (leagueId: string) => [...tournamentKeys.all, 'list', leagueId] as const,
  detail: (leagueId: string, id: string) => [...tournamentKeys.all, 'detail', leagueId, id] as const,
}

export const useTournaments = (leagueId: string) =>
  useQuery({ queryKey: tournamentKeys.list(leagueId), queryFn: () => tournamentsApi.list(leagueId) })

export const useTournament = (leagueId: string, id: string) =>
  useQuery({ queryKey: tournamentKeys.detail(leagueId, id), queryFn: () => tournamentsApi.get(leagueId, id) })

// Любое изменение турнира инвалидирует все запросы по турнирам (список + карточка)
function useTournamentMutation<TData, TVariables>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tournamentKeys.all }),
  })
}

export const useCreateTournament = (leagueId: string) =>
  useTournamentMutation((body: CreateTournamentBody) => tournamentsApi.create(leagueId, body))

export const useAddStage = (leagueId: string, tournamentId: string) =>
  useTournamentMutation((body: AddStageBody) => tournamentsApi.addStage(leagueId, tournamentId, body))

export const useChangeTournamentStatus = (leagueId: string, tournamentId: string) =>
  useTournamentMutation((action: TournamentAction) =>
    tournamentsApi.changeStatus(leagueId, tournamentId, action),
  )

export const useUpdateTournament = (leagueId: string, tournamentId: string) =>
  useTournamentMutation((body: UpdateTournamentBody) => tournamentsApi.update(leagueId, tournamentId, body))

// Удалённый турнир убираем из кэша, а не перезапрашиваем: иначе открытая карточка мигнёт 404.
export const useDeleteTournament = (leagueId: string, tournamentId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => tournamentsApi.remove(leagueId, tournamentId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: tournamentKeys.detail(leagueId, tournamentId) })
      return queryClient.invalidateQueries({ queryKey: tournamentKeys.list(leagueId) })
    },
  })
}

export const useUpdateStage = (leagueId: string, tournamentId: string) =>
  useTournamentMutation((input: { stageId: string; body: StageBody }) =>
    tournamentsApi.updateStage(leagueId, tournamentId, input.stageId, input.body),
  )

// Перезапрос турнира не ждём: страница удалённого этапа сразу уходит на турнир,
// иначе она успела бы мигнуть сообщением «Этап не найден».
export const useDeleteStage = (leagueId: string, tournamentId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stageId: string) => tournamentsApi.removeStage(leagueId, tournamentId, stageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.all })
    },
  })
}

export const useAddDivision = (leagueId: string, tournamentId: string) =>
  useTournamentMutation((name: string) => tournamentsApi.addDivision(leagueId, tournamentId, name))

export const useRenameDivision = (leagueId: string, tournamentId: string) =>
  useTournamentMutation((input: { divisionId: string; name: string }) =>
    tournamentsApi.renameDivision(leagueId, tournamentId, input.divisionId, input.name),
  )

export const useDeleteDivision = (leagueId: string, tournamentId: string) =>
  useTournamentMutation((divisionId: string) => tournamentsApi.removeDivision(leagueId, tournamentId, divisionId))

/** Группа этапа: groupId задан — правка, иначе новая группа. */
export const useSaveStageGroup = (leagueId: string, tournamentId: string, stageId: string) =>
  useTournamentMutation<unknown, { groupId?: string; body: StageGroupBody }>((input) =>
    input.groupId
      ? tournamentsApi.updateStageGroup(leagueId, tournamentId, stageId, input.groupId, input.body)
      : tournamentsApi.addStageGroup(leagueId, tournamentId, stageId, input.body),
  )

export const useDeleteStageGroup = (leagueId: string, tournamentId: string, stageId: string) =>
  useTournamentMutation((groupId: string) =>
    tournamentsApi.removeStageGroup(leagueId, tournamentId, stageId, groupId),
  )
