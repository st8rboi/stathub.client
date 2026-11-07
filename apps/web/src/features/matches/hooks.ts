import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountKeys } from '@/features/accounts/hooks'
import { financeKeys } from '@/features/finance/hooks'
import { matchesApi } from './api'
import type { CreateMatchBody, UpdateMatchBody } from './types'

export const matchKeys = {
  all: ['matches'] as const,
  byStage: (stageId: string) => [...matchKeys.all, 'stage', stageId] as const,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: matchKeys.byStage(stageId) }),
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
