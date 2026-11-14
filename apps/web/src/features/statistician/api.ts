import { request } from '@/shared/api/client'
import type { AppendEventsResult, AssignedMatch, MatchState, NewMatchEvent } from './types'

export const statisticianApi = {
  /** Назначенные мне матчи: эндпоинт общий для судьи и статистика. */
  myMatches: () => request<AssignedMatch[]>('GET', '/referee/matches'),
  state: (matchId: string) => request<MatchState>('GET', `/matches/${matchId}/state`),
  append: (matchId: string, events: NewMatchEvent[]) =>
    request<AppendEventsResult>('POST', `/matches/${matchId}/events`, {
      events,
      // По расхождению с часами сервера он поправит время событий, отправленных с задержкой.
      sentAtUtc: new Date().toISOString(),
    }),
}

export const statisticianKeys = {
  all: ['statistician'] as const,
  matches: () => [...statisticianKeys.all, 'matches'] as const,
  state: (matchId: string) => [...statisticianKeys.all, 'state', matchId] as const,
}
