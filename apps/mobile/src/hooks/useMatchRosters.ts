import { playersApi, rostersApi } from '../api/directory'
import type { Match, PlayerRegistration, TournamentTeamDetails } from '../api/types'
import { cacheKeys } from '../storage/offlineCache'
import { usePersistedQuery } from './usePersistedQuery'

export type RosterPlayer = {
  playerId: string
  fullName: string
}

export type MatchRosters = {
  home: RosterPlayer[]
  away: RosterPlayer[]
}

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000'

/**
 * Составы обеих команд матча. Событие хранит игрока по Id, а состав заявлен на этап
 * (дивизион), поэтому цепочка такая: этап → заявка команды → активные заявки игроков → их ФИО.
 *
 * Один композитный запрос вместо четырёх: экран судьи должен получить составы одним
 * «пакетом», иначе на плохой связи гол отмечается дольше, чем идёт атака.
 */
export async function fetchMatchRosters(match: Match): Promise<MatchRosters> {
  const { stageId, homeTeamId, awayTeamId } = match

  if (!stageId || stageId === EMPTY_GUID) return { home: [], away: [] }

  const tournamentTeams = await rostersApi.listTeams(stageId)

  const homeTournamentTeam = tournamentTeams.find((team) => team.teamId === homeTeamId)
  const awayTournamentTeam = tournamentTeams.find((team) => team.teamId === awayTeamId)

  const [homeDetails, awayDetails] = await Promise.all([
    homeTournamentTeam ? rostersApi.getTeam(stageId, homeTournamentTeam.id) : null,
    awayTournamentTeam ? rostersApi.getTeam(stageId, awayTournamentTeam.id) : null,
  ])

  const activeRegistrations = (details: TournamentTeamDetails | null): PlayerRegistration[] =>
    (details?.registrations ?? []).filter((registration) => registration.status === 'Active')

  const homeRegistrations = activeRegistrations(homeDetails)
  const awayRegistrations = activeRegistrations(awayDetails)

  const playerIds = [
    ...new Set([...homeRegistrations, ...awayRegistrations].map((registration) => registration.playerId)),
  ]

  const players = playerIds.length > 0 ? await playersApi.byIds(playerIds) : []
  const nameById = new Map(players.map((player) => [player.id, player.fullName]))

  const toRoster = (registrations: PlayerRegistration[]): RosterPlayer[] =>
    registrations
      .map((registration) => ({
        playerId: registration.playerId,
        fullName: nameById.get(registration.playerId) ?? 'Игрок',
      }))
      // Номеров нет — судья ищет игрока по фамилии, поэтому по алфавиту.
      .sort((left, right) => left.fullName.localeCompare(right.fullName, 'ru'))

  return { home: toRoster(homeRegistrations), away: toRoster(awayRegistrations) }
}

export function useMatchRosters(match: Match | undefined) {
  const matchId = match?.id ?? ''

  const query = usePersistedQuery({
    cacheKey: cacheKeys.matchRosters(matchId),
    queryKey: ['matchRosters', matchId],
    enabled: Boolean(match),
    staleTime: 30_000,
    queryFn: () => fetchMatchRosters(match as Match),
  })

  return {
    home: query.data?.home ?? [],
    away: query.data?.away ?? [],
    isLoading: query.isFetching,
  }
}
