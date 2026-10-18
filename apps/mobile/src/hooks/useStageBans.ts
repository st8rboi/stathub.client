import { useQuery } from '@tanstack/react-query'

import { request } from '../api/client'

export type StageBan = {
  id: string
  playerId: string
  teamId: string
  matchesBanned: number | null
  matchesServed: number
  isActive: boolean
}

/**
 * Действующие дисквалификации этапа: нужны, чтобы судья видел пометку у игрока
 * ещё до попытки записать событие (сервер всё равно отклонит).
 */
export function useStageBans(stageId: string) {
  return useQuery({
    queryKey: ['stageBans', stageId],
    queryFn: () => request<StageBan[]>('GET', `/discipline/stages/${stageId}`),
    enabled: Boolean(stageId),
    staleTime: 30_000,
    retry: 1,
  })
}
