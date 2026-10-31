import { teamsApi } from '../api/directory'
import { shortId } from '../match/format'
import { cacheKeys } from '../storage/offlineCache'
import { usePersistedQuery } from './usePersistedQuery'

export const fetchTeams = (ids: string[]) => teamsApi.byIds([...ids].sort())

/**
 * Названия команд по идентификаторам. Матч хранит только Id, имена живут в справочнике
 * команд, поэтому подписи подтягиваются отдельным запросом (и кэшируются).
 */
export function useTeamNames(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))].sort()

  const query = usePersistedQuery({
    cacheKey: cacheKeys.teamNames(uniqueIds),
    queryKey: ['teamNames', uniqueIds.join(',')],
    queryFn: () => fetchTeams(uniqueIds),
    enabled: uniqueIds.length > 0,
    staleTime: 60_000,
  })

  const namesById = new Map((query.data ?? []).map((team) => [team.id, team.name]))

  return (id: string) => namesById.get(id) ?? shortId(id)
}
