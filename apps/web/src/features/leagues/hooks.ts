import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leaguesApi } from './api'

export const leagueKeys = {
  all: ['leagues'] as const,
  list: (organizerId: string) => [...leagueKeys.all, 'list', organizerId] as const,
  detail: (id: string) => [...leagueKeys.all, 'detail', id] as const,
}

export const useLeagues = (organizerId: string, enabled: boolean) =>
  useQuery({
    queryKey: leagueKeys.list(organizerId),
    queryFn: () => leaguesApi.list(organizerId),
    enabled,
  })

export const useLeague = (id: string) =>
  useQuery({ queryKey: leagueKeys.detail(id), queryFn: () => leaguesApi.get(id) })

// Любое изменение лиги инвалидирует все запросы по лигам (список + карточка)
function useLeagueMutation<TData, TVariables>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leagueKeys.all }),
  })
}

export const useCreateLeague = () => useLeagueMutation(leaguesApi.create)
export const usePublishLeague = () => useLeagueMutation(leaguesApi.publish)
export const useArchiveLeague = () => useLeagueMutation(leaguesApi.archive)
