import { useQuery } from '@tanstack/react-query'

import { teamsApi } from '../api/directory'
import { shortId } from '../match/format'

/**
 * Названия команд по идентификаторам. Матч хранит только Id, имена живут в справочнике
 * команд, поэтому подписи подтягиваются отдельным запросом (и кэшируются).
 */
export function useTeamNames(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))].sort()

  const query = useQuery({
    queryKey: ['teamNames', uniqueIds.join(',')],
    queryFn: () => teamsApi.byIds(uniqueIds),
    enabled: uniqueIds.length > 0,
    staleTime: 60_000,
    retry: 1,
  })

  const namesById = new Map((query.data ?? []).map((team) => [team.id, team.name]))

  return (id: string) => namesById.get(id) ?? shortId(id)
}
