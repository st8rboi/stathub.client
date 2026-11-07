import { request } from '@/shared/api/client'
import type { CreateMatchBody, Match, UpdateMatchBody } from './types'

export const matchesApi = {
  listByStage: (stageId: string) =>
    request<Match[]>('GET', `/matches?stageId=${encodeURIComponent(stageId)}`),
  create: (body: CreateMatchBody) => request<{ id: string }>('POST', '/matches', body),
  update: (id: string, body: UpdateMatchBody) => request<Match>('PUT', `/matches/${id}`, body),
  remove: (id: string) => request<void>('DELETE', `/matches/${id}`),
}
