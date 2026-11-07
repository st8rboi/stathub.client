import { useEffect, useState } from 'react'

import { request } from '../api/client'
import type { RefereeMatch } from '../api/types'
import { prefetchMatches } from '../match/prefetch'
import { cacheKeys } from '../storage/offlineCache'
import { usePersistedQuery } from './usePersistedQuery'

/**
 * Назначенные мне матчи: единственный источник списка на главном экране судьи.
 * Каждый свежий ответ сервера заодно скачивает данные этих матчей для работы без сети.
 */
export function useMyMatches() {
  const query = usePersistedQuery({
    cacheKey: cacheKeys.myMatches(),
    queryKey: ['referee', 'matches'],
    queryFn: () => request<RefereeMatch[]>('GET', '/referee/matches'),
    staleTime: 10_000,
  })

  const [offlineReady, setOfflineReady] = useState<number | null>(null)
  const { data, dataUpdatedAt } = query

  useEffect(() => {
    if (!dataUpdatedAt || !data) return

    let active = true
    void prefetchMatches(data).then((ready) => {
      if (active) setOfflineReady(ready)
    })

    return () => {
      active = false
    }
  }, [dataUpdatedAt])

  return { ...query, offlineReady }
}
