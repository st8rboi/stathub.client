import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { playersApi } from './api'
import type { CreatePlayerBody } from './types'

export const playerKeys = {
  all: ['players'] as const,
  list: (query: string) => [...playerKeys.all, 'list', query] as const,
  byIds: (ids: string[]) => [...playerKeys.all, 'ids', ids.join(',')] as const,
}

export const usePlayers = (query = '') =>
  useQuery({ queryKey: playerKeys.list(query), queryFn: () => playersApi.list(query) })

/** Игроки по Id — имена для составов: заявки хранят только идентификаторы. */
export const usePlayersByIds = (ids: string[]) =>
  useQuery({
    queryKey: playerKeys.byIds(ids),
    queryFn: () => playersApi.byIds(ids),
    enabled: ids.length > 0,
  })

export const useCreatePlayer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePlayerBody) => playersApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: playerKeys.all }),
  })
}
