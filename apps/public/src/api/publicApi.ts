import { request } from './client'
import type {
  PublicLeague,
  PublicLeaguePage,
  PublicMatch,
  PublicMatchDay,
  PublicMatchPage,
  PublicStagePage,
  PublicTeamPage,
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
  /** Дни с матчами опубликованных лиг; граница дня — по часовому поясу зрителя (IANA). */
  matchDays: (timeZone: string) =>
    request<PublicMatchDay[]>(`/public/match-days${query({ timeZone })}`),
  match: (matchId: string) => request<PublicMatchPage>(`/public/matches/${matchId}`),
  /** Страница команды; без stageId сервер выбирает самый свежий этап. */
  team: (teamId: string, stageId?: string) =>
    request<PublicTeamPage>(`/public/teams/${teamId}${query({ stageId })}`),
  live: () => request<PublicMatch[]>('/public/live'),
  /** Статистика игроков одного дивизиона турнира; без divisionId сервер отдаёт первый дивизион. */
  tournamentStatistics: (tournamentId: string, divisionId?: string) =>
    request<TournamentStatistics>(`/public/tournaments/${tournamentId}/statistics${query({ divisionId })}`),
}
