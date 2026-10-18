import { request } from '@/shared/api/client'
import type { CreatePlayerBody, Player } from './types'

export const playersApi = {
  list: (query?: string) =>
    request<Player[]>('GET', query ? `/players?query=${encodeURIComponent(query)}` : '/players'),
  byIds: (ids: string[]) => request<Player[]>('GET', `/players?ids=${ids.join(',')}`),
  create: (body: CreatePlayerBody) => request<{ id: string }>('POST', '/players', body),
}
