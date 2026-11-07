import { request } from '@/shared/api/client'
import type { CreatePlayerBody, Player, UpdatePlayerBody } from './types'

export const playersApi = {
  list: (query?: string) =>
    request<Player[]>('GET', query ? `/players?query=${encodeURIComponent(query)}` : '/players'),
  byIds: (ids: string[]) => request<Player[]>('GET', `/players?ids=${ids.join(',')}`),
  create: (body: CreatePlayerBody) => request<{ id: string }>('POST', '/players', body),
  update: (id: string, body: UpdatePlayerBody) => request<Player>('PUT', `/players/${id}`, body),
  remove: (id: string) => request<void>('DELETE', `/players/${id}`),
}
