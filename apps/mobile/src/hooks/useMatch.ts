import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { matchesApi } from '../api/matches'
import type { Match } from '../api/types'
import { findRecentMatch, rememberMatch } from '../storage/recentMatches'

export const matchQueryKey = (id: string) => ['match', id] as const
export const stageMatchesQueryKey = (stageId: string) => ['stage', stageId, 'matches'] as const

/**
 * Матч + последний локальный снимок. `cachedMatch` нужен, когда связи нет:
 * экран показывает известное состояние и предупреждение, а не пустой экран.
 */
export function useMatchQuery(id: string) {
  const [cachedMatch, setCachedMatch] = useState<Match | null>(null)

  useEffect(() => {
    let active = true
    void findRecentMatch(id).then((match) => {
      if (active && match) setCachedMatch(match)
    })

    return () => {
      active = false
    }
  }, [id])

  const query = useQuery({
    queryKey: matchQueryKey(id),
    queryFn: () => matchesApi.getMatch(id),
    enabled: Boolean(id),
    staleTime: 0,
    retry: 1,
  })

  useEffect(() => {
    if (query.data) void rememberMatch(query.data)
  }, [query.data])

  return { ...query, cachedMatch }
}

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
        await queryClient.invalidateQueries({ queryKey: matchQueryKey(id) })
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
