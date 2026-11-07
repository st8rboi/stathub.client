import { matchesApi } from '../api/matches'
import type { RefereeMatch } from '../api/types'
import { fetchMatchRosters } from '../hooks/useMatchRosters'
import { fetchStageBans } from '../hooks/useStageBans'
import { fetchTeams } from '../hooks/useTeamNames'
import { cacheKeys, writeCache } from '../storage/offlineCache'
import { rememberMatch } from '../storage/recentMatches'

/**
 * Пока есть сеть, заранее скачивает всё, что нужно судье на поле: тогда матч откроется
 * и без связи, с составами и пометками о дисквалификациях.
 * @returns сколько незавершённых матчей готово к работе без сети
 */
export async function prefetchMatches(matches: RefereeMatch[]): Promise<number> {
  const active = matches.filter((match) => match.status !== 'Finished' && match.status !== 'Cancelled')
  let ready = 0

  for (const item of active) {
    try {
      const state = await matchesApi.getState(item.id)
      const teamIds = [state.match.homeTeamId, state.match.awayTeamId]

      const [rosters, bans, teams] = await Promise.all([
        fetchMatchRosters(state.match),
        fetchStageBans(state.match.stageId),
        fetchTeams(teamIds),
      ])

      await Promise.all([
        writeCache(cacheKeys.matchState(item.id), state),
        writeCache(cacheKeys.matchRosters(item.id), rosters),
        writeCache(cacheKeys.stageBans(state.match.stageId), bans),
        writeCache(cacheKeys.teamNames(teamIds), teams),
        rememberMatch(state.match),
      ])

      ready += 1
    } catch {
      // Связь пропала на середине: остальное скачается при следующем обновлении списка.
    }
  }

  return ready
}
