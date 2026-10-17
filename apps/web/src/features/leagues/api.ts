import { uploadFile } from '@/shared/api/client'
import { request } from '@/shared/api/client'
import type { CreateLeagueBody, League } from './types'

export const leaguesApi = {
  list: (organizerId: string) => request<League[]>('GET', `/leagues?organizerId=${organizerId}`),
  get: (id: string) => request<League>('GET', `/leagues/${id}`),
  create: (body: CreateLeagueBody) => request<{ id: string }>('POST', '/leagues', body),
  publish: (id: string) => request<void>('POST', `/leagues/${id}/publish`),
  archive: (id: string) => request<void>('POST', `/leagues/${id}/archive`),
  uploadLogo: (id: string, file: File) => uploadFile<League>(`/leagues/${id}/logo`, file),
  deleteLogo: (id: string) => request<League>('DELETE', `/leagues/${id}/logo`),
}
