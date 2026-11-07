import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leaguesApi } from './api'
import type { UpdateLeagueBody } from './types'

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
export const useUpdateLeague = () =>
  useLeagueMutation((input: { id: string; body: UpdateLeagueBody }) => leaguesApi.update(input.id, input.body))
// Удалённую лигу убираем из кэша, а не перезапрашиваем: иначе открытая карточка мигнёт 404.
export const useDeleteLeague = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => leaguesApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: leagueKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: [...leagueKeys.all, 'list'] })
    },
  })
}

export const useUploadLeagueLogo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; file: File }) => leaguesApi.uploadLogo(input.id, input.file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leagueKeys.all }),
  })
}

export const useDeleteLeagueLogo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => leaguesApi.deleteLogo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leagueKeys.all }),
  })
}
