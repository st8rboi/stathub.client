import { request } from './client'
import type {
  PublicLeague,
  PublicLeaguePage,
  PublicMatch,
  PublicMatchPage,
  PublicStagePage,
  TournamentStatistics,
} from './types'

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value && value.trim()) search.set(key, value.trim())
  }

  const serialized = search.toString()
  return serialized ? `?${serialized}` : ''
}

export const publicApi = {
  leagues: (club?: string, city?: string) =>
    request<PublicLeague[]>(`/public/leagues${query({ query: club, city })}`),
  league: (slug: string) => request<PublicLeaguePage>(`/public/leagues/${encodeURIComponent(slug)}`),
  stage: (stageId: string) => request<PublicStagePage>(`/public/stages/${stageId}`),
  /** Расписание на интервал: полоса дат и список соревнований строятся из одного ответа. */
  schedule: (fromUtc: Date, toUtc: Date) =>
    request<PublicMatch[]>(
      `/public/matches${query({ fromUtc: fromUtc.toISOString(), toUtc: toUtc.toISOString() })}`,
    ),
  match: (matchId: string) => request<PublicMatchPage>(`/public/matches/${matchId}`),
  live: () => request<PublicMatch[]>('/public/live'),
  /** Статистика игроков — всегда в разрезе конкретного турнира. */
  tournamentStatistics: (tournamentId: string) =>
    request<TournamentStatistics>(`/public/tournaments/${tournamentId}/statistics`),
}
