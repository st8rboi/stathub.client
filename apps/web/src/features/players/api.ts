import { chunkIds, request, uploadFile } from '@/shared/api/client'
import type { CreatePlayerBody, Player, UpdatePlayerBody } from './types'

/** Сколько игроков сервер отдаёт списком за раз (его максимум). Постраничной выдачи нет. */
export const PLAYERS_LIST_LIMIT = 100

export const playersApi = {
  /** Без запроса — недавно добавленные, с запросом — поиск по ФИО; не больше `limit` записей. */
  list: (query = '', limit = PLAYERS_LIST_LIMIT) =>
    request<Player[]>(
      'GET',
      `/players?limit=${limit}${query ? `&query=${encodeURIComponent(query)}` : ''}`,
    ),
  byIds: async (ids: string[]) =>
    (await Promise.all(chunkIds(ids).map((chunk) => request<Player[]>('GET', `/players?ids=${chunk.join(',')}`)))).flat(),
  create: (body: CreatePlayerBody) => request<{ id: string }>('POST', '/players', body),
  update: (id: string, body: UpdatePlayerBody) => request<Player>('PUT', `/players/${id}`, body),
  remove: (id: string) => request<void>('DELETE', `/players/${id}`),
  uploadPhoto: (id: string, file: File) => uploadFile<Player>(`/players/${id}/photo`, file),
  deletePhoto: (id: string) => request<Player>('DELETE', `/players/${id}/photo`),
}
