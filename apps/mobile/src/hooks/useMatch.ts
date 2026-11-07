import { useQuery } from '@tanstack/react-query'

import { matchesApi } from '../api/matches'

export const stageMatchesQueryKey = (stageId: string) => ['stage', stageId, 'matches'] as const

export function useStageMatchesQuery(stageId: string) {
  return useQuery({
    queryKey: stageMatchesQueryKey(stageId),
    queryFn: () => matchesApi.listByStage(stageId),
    enabled: Boolean(stageId),
    staleTime: 15_000,
    retry: 1,
  })
}
