import { chunkIds, request, uploadFile } from '@/shared/api/client'
import type { CreateTeamBody, Team, UpdateTeamBody } from './types'

/** Сколько команд сервер отдаёт списком за раз (его максимум). Постраничной выдачи нет. */
export const TEAMS_LIST_LIMIT = 500

export const teamsApi = {
  /** Справочник по алфавиту с поиском по названию — не больше TEAMS_LIST_LIMIT записей. */
  list: (query = '') =>
    request<Team[]>(
      'GET',
      `/teams?limit=${TEAMS_LIST_LIMIT}${query ? `&query=${encodeURIComponent(query)}` : ''}`,
    ),
  /** Конкретные команды по Id: названия и логотипы не зависят от размера справочника. */
  byIds: async (ids: string[]) =>
    (await Promise.all(chunkIds(ids).map((chunk) => request<Team[]>('GET', `/teams?ids=${chunk.join(',')}`)))).flat(),
  create: (body: CreateTeamBody) => request<{ id: string }>('POST', '/teams', body),
  update: (id: string, body: UpdateTeamBody) => request<Team>('PUT', `/teams/${id}`, body),
  remove: (id: string) => request<void>('DELETE', `/teams/${id}`),
  uploadLogo: (id: string, file: File) => uploadFile<Team>(`/teams/${id}/logo`, file),
  deleteLogo: (id: string) => request<Team>('DELETE', `/teams/${id}/logo`),
}
