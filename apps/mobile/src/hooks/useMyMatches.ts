import { useQuery } from '@tanstack/react-query'

import { request } from '../api/client'
import type { RefereeMatch } from '../api/types'

/** Назначенные мне матчи: единственный источник списка на главном экране судьи. */
export function useMyMatches() {
  return useQuery({
    queryKey: ['referee', 'matches'],
    queryFn: () => request<RefereeMatch[]>('GET', '/referee/matches'),
    staleTime: 10_000,
    retry: 1,
  })
}
