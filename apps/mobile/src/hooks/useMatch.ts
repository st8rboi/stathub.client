import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { matchesApi } from '../api/matches'
import { matchStateQueryKey } from './useMatchEvents'

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

/**
 * Действия жизненного цикла. Каждое — отдельный мутант, чтобы UI показывал прогресс
 * точечно; ошибки отдаются наружу через `onError`.
 */
export function useMatchActions(id: string, onError?: (error: Error) => void) {
  const queryClient = useQueryClient()

  const makeAction = (run: (matchId: string) => Promise<void>) =>
    useMutation({
      mutationFn: () => run(id),
      onSuccess: async () => {
        // Экран матча читает состояние (матч + протокол), поэтому обновляем именно этот запрос:
        // иначе после «Начать матч» / «Завершить матч» на экране остался бы старый статус.
        await queryClient.invalidateQueries({ queryKey: matchStateQueryKey(id) })
      },
      onError,
    })

  return {
    start: makeAction(matchesApi.start),
    stop: makeAction(matchesApi.stop),
    resume: makeAction(matchesApi.resume),
    nextPeriod: makeAction(matchesApi.nextPeriod),
    finish: makeAction(matchesApi.finish),
  }
}
