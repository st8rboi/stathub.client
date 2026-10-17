import { request, uploadFile } from '@/shared/api/client'
import type { CreateTeamBody, Team } from './types'

export const teamsApi = {
  list: (query?: string) =>
    request<Team[]>('GET', query ? `/teams?query=${encodeURIComponent(query)}` : '/teams'),
  create: (body: CreateTeamBody) => request<{ id: string }>('POST', '/teams', body),
  uploadLogo: (id: string, file: File) => uploadFile<Team>(`/teams/${id}/logo`, file),
  deleteLogo: (id: string) => request<Team>('DELETE', `/teams/${id}/logo`),
}
