import AsyncStorage from '@react-native-async-storage/async-storage'

import type { Match } from '../api/types'

const RECENT_MATCHES_KEY = '@stathub/recentMatches'
const RECENT_LIMIT = 8

export type RecentMatch = {
  match: Match
  savedAt: string
}

/**
 * Локальный кэш последних матчей. Нужен по двум причинам:
 * 1) судья возвращается к тому же матчу без ввода кода;
 * 2) если связи нет, экран матча показывает последний известный снимок,
 *    а не пустоту (сервер пока не отдаёт офлайн-очередь, но снимок уже полезен).
 */
export async function loadRecentMatches(): Promise<RecentMatch[]> {
  const raw = await AsyncStorage.getItem(RECENT_MATCHES_KEY)
  if (!raw) return []

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRecentMatch)
  } catch {
    return []
  }
}

function isRecentMatch(value: unknown): value is RecentMatch {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<RecentMatch>
  return (
    typeof candidate.savedAt === 'string' &&
    typeof candidate.match === 'object' &&
    candidate.match !== null &&
    typeof candidate.match.id === 'string'
  )
}

export async function findRecentMatch(id: string): Promise<Match | null> {
  const recent = await loadRecentMatches()
  return recent.find((item) => item.match.id === id)?.match ?? null
}

export async function rememberMatch(match: Match): Promise<void> {
  const recent = await loadRecentMatches()
  const next: RecentMatch[] = [
    { match, savedAt: new Date().toISOString() },
    ...recent.filter((item) => item.match.id !== match.id),
  ].slice(0, RECENT_LIMIT)

  await AsyncStorage.setItem(RECENT_MATCHES_KEY, JSON.stringify(next))
}

export async function forgetMatch(id: string): Promise<void> {
  const recent = await loadRecentMatches()
  const next = recent.filter((item) => item.match.id !== id)
  await AsyncStorage.setItem(RECENT_MATCHES_KEY, JSON.stringify(next))
}
