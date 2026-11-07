import { request } from '../api/client'
import { cacheKeys } from '../storage/offlineCache'
import { usePersistedQuery } from './usePersistedQuery'

export type StageBan = {
  id: string
  playerId: string
  teamId: string
  matchesBanned: number | null
  matchesServed: number
  isActive: boolean
}

export const fetchStageBans = (stageId: string) =>
  request<StageBan[]>('GET', `/discipline/stages/${stageId}`)

/**
 * Действующие дисквалификации этапа: судья видит пометку у игрока, но записать событие может.
 * Без связи список мог устареть, поэтому решает организатор: сервер примет событие с пометкой.
 */
export function useStageBans(stageId: string) {
  return usePersistedQuery({
    cacheKey: cacheKeys.stageBans(stageId),
    queryKey: ['stageBans', stageId],
    queryFn: () => fetchStageBans(stageId),
    enabled: Boolean(stageId),
    staleTime: 30_000,
  })
}
