import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tournamentsApi } from './api'
import type { AddStageBody, CreateTournamentBody, TournamentAction } from './types'

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
