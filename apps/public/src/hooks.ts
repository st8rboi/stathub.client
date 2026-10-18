import { useQuery } from '@tanstack/react-query'
import { publicApi } from './api/publicApi'
import type { PublicMatch } from './api/types'

export const publicKeys = {
  leagues: (club: string, city: string) => ['public', 'leagues', club, city] as const,
  league: (slug: string) => ['public', 'league', slug] as const,
  stage: (stageId: string) => ['public', 'stage', stageId] as const,
  match: (matchId: string) => ['public', 'match', matchId] as const,
  live: () => ['public', 'live'] as const,
  schedule: (fromUtc: string, toUtc: string) => ['public', 'schedule', fromUtc, toUtc] as const,
  statistics: (tournamentId: string) => ['public', 'statistics', tournamentId] as const,
}

export const useLeagues = (club: string, city: string) =>
  useQuery({ queryKey: publicKeys.leagues(club, city), queryFn: () => publicApi.leagues(club, city) })

export const useLeague = (slug: string) =>
  useQuery({ queryKey: publicKeys.league(slug), queryFn: () => publicApi.league(slug), enabled: !!slug })

export const useStage = (stageId: string) =>
  useQuery({ queryKey: publicKeys.stage(stageId), queryFn: () => publicApi.stage(stageId), enabled: !!stageId })

/** Расписание на 7 дней: один запрос даёт и счётчики для полосы дат, и матчи дня. */
export const useSchedule = (from: Date, to: Date) =>
  useQuery({
    queryKey: publicKeys.schedule(from.toISOString(), to.toISOString()),
    queryFn: () => publicApi.schedule(from, to),
    refetchInterval: 60_000,
  })

/**
 * Матч: пока идёт — дообновляем опросом раз в 15 секунд, даже если SignalR-пуш
 * не дошёл (документация §9 требует независимый путь синхронизации).
 */
export const useMatch = (matchId: string) =>
  useQuery({
    queryKey: publicKeys.match(matchId),
    queryFn: () => publicApi.match(matchId),
    enabled: !!matchId,
    refetchInterval: (queryState) => {
      const match = queryState.state.data?.match
      return match && (match.status === 'InProgress' || match.status === 'Pause') ? 15_000 : false
    },
  })

export const useLive = () =>
  useQuery({ queryKey: publicKeys.live(), queryFn: () => publicApi.live(), refetchInterval: 30_000 })

export const useTournamentStatistics = (tournamentId: string) =>
  useQuery({
    queryKey: publicKeys.statistics(tournamentId),
    queryFn: () => publicApi.tournamentStatistics(tournamentId),
    enabled: !!tournamentId,
  })

export const isLive = (match: PublicMatch) =>
  match.status === 'InProgress' || match.status === 'Pause'
