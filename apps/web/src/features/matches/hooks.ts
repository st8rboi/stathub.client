import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { matchesApi } from './api'
import type { CreateMatchBody } from './types'

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
