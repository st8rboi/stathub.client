import { request } from '@/shared/api/client'
import type { CreateMatchBody, Match } from './types'

export const matchesApi = {
  listByStage: (stageId: string) =>
    request<Match[]>('GET', `/matches?stageId=${encodeURIComponent(stageId)}`),
  create: (body: CreateMatchBody) => request<{ id: string }>('POST', '/matches', body),
}
