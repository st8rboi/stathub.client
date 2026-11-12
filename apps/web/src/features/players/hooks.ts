import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PLAYERS_LIST_LIMIT, playersApi } from './api'
import type { CreatePlayerBody, UpdatePlayerBody } from './types'

export const playerKeys = {
  all: ['players'] as const,
  list: (query: string, limit: number) => [...playerKeys.all, 'list', query, limit] as const,
  byIds: (ids: string[]) => [...playerKeys.all, 'ids', ids.join(',')] as const,
}

interface UsePlayersOptions {
  enabled?: boolean
  /** Сколько записей запросить (не больше PLAYERS_LIST_LIMIT). */
  limit?: number
  /** Держать прежний список на экране, пока грузится новый (страница справочника). */
  keepPrevious?: boolean
}

export const usePlayers = (
  query = '',
  { enabled = true, limit = PLAYERS_LIST_LIMIT, keepPrevious = false }: UsePlayersOptions = {},
) =>
  useQuery({
    queryKey: playerKeys.list(query, limit),
    queryFn: () => playersApi.list(query, limit),
    enabled,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  })

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

export const useUpdatePlayer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; body: UpdatePlayerBody }) => playersApi.update(input.id, input.body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: playerKeys.all }),
  })
}

export const useDeletePlayer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => playersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: playerKeys.all }),
  })
}

export const useUploadPlayerPhoto = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; file: File }) => playersApi.uploadPhoto(input.id, input.file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: playerKeys.all }),
  })
}

export const useDeletePlayerPhoto = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => playersApi.deletePhoto(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: playerKeys.all }),
  })
}
