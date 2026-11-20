import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountKeys } from '@/features/accounts/hooks'
import { financeKeys } from '@/features/finance/hooks'
import { matchesApi } from './api'
import type { CreateMatchBody, NewProtocolEvent, UpdateMatchBody } from './types'

export const matchKeys = {
  all: ['matches'] as const,
  byStage: (stageId: string) => [...matchKeys.all, 'stage', stageId] as const,
  state: (matchId: string) => [...matchKeys.all, 'state', matchId] as const,
}

export const useStageMatches = (stageId: string) =>
  useQuery({
    queryKey: matchKeys.byStage(stageId),
    queryFn: () => matchesApi.listByStage(stageId),
    enabled: Boolean(stageId),
  })

export const useCreateMatch = (stageId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateMatchBody) => matchesApi.create(body),
    // Вместе с матчем сервер создаёт взносы — сводка и начисления тоже устарели.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: matchKeys.byStage(stageId) }),
        queryClient.invalidateQueries({ queryKey: financeKeys.all }),
      ]),
  })
}

// Правка и удаление матча меняют и взносы (команда начисления), и назначения судей —
// их списки тоже перезапрашиваем.
function useMatchChangeMutation<TVariables>(stageId: string, mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: matchKeys.byStage(stageId) }),
        queryClient.invalidateQueries({ queryKey: financeKeys.all }),
        queryClient.invalidateQueries({ queryKey: accountKeys.all }),
      ]),
  })
}

export const useUpdateMatch = (stageId: string) =>
  useMatchChangeMutation(stageId, (input: { id: string; body: UpdateMatchBody }) =>
    matchesApi.update(input.id, input.body),
  )

export const useDeleteMatch = (stageId: string) =>
  useMatchChangeMutation(stageId, (id: string) => matchesApi.remove(id))

/**
 * Отмена матча: протокол остаётся, матч уходит из live, таблицы и статистики.
 * Обновляем и список этапа, и протокол (если он открыт).
 */
export const useCancelMatch = (stageId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => matchesApi.cancel(id),
    onSuccess: (_, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: matchKeys.byStage(stageId) }),
        queryClient.invalidateQueries({ queryKey: matchKeys.state(id) }),
      ]),
  })
}

/**
 * Матч и протокол целиком — экран протокола организатора. Пока матч идёт, события вносит
 * судья с телефона — подтягиваем их опросом; до начала — реже, чтобы заметить стартовый
 * свисток. У завершённого и отменённого матча опроса нет.
 */
export const useMatchState = (matchId: string) =>
  useQuery({
    queryKey: matchKeys.state(matchId),
    queryFn: () => matchesApi.state(matchId),
    enabled: Boolean(matchId),
    refetchInterval: (query) => {
      const status = query.state.data?.match.status
      if (status === 'InProgress' || status === 'Pause') return 5_000
      return status === 'Scheduled' ? 30_000 : false
    },
  })

/**
 * События от организатора (в том числе правка завершённого матча). Ответ сервера — новое
 * состояние: кладём его в кэш сразу; счёт в списке этапа тоже мог измениться.
 */
export const useAppendProtocolEvents = (stageId: string, matchId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (events: NewProtocolEvent[]) => matchesApi.appendEvents(matchId, events),
    onSuccess: (result) => {
      queryClient.setQueryData(matchKeys.state(matchId), result.state)
      return queryClient.invalidateQueries({ queryKey: matchKeys.byStage(stageId) })
    },
  })
}
