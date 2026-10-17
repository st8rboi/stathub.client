import { useQuery } from '@tanstack/react-query'

import { playersApi, rostersApi } from '../api/directory'
import type { Match, PlayerRegistration, TournamentTeamDetails } from '../api/types'

export type RosterPlayer = {
  playerId: string
  fullName: string
  squadNumber: number | null
}

export type MatchRosters = {
  home: RosterPlayer[]
  away: RosterPlayer[]
}

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000'

/**
 * Составы обеих команд матча. Событие хранит игрока по Id, а состав привязан к турниру
 * (заявка команды на сезон), поэтому цепочка такая:
 * турнир → заявка команды → активные заявки игроков → их ФИО.
 *
 * Один композитный запрос вместо четырёх: экран судьи должен получить составы одним
 * «пакетом», иначе на плохой связи гол отмечается дольше, чем идёт атака.
 */
export function useMatchRosters(match: Match | undefined) {
  const matchId = match?.id ?? ''
  const tournamentId = match?.tournamentId ?? ''
  const homeTeamId = match?.homeTeamId ?? ''
  const awayTeamId = match?.awayTeamId ?? ''

  // У матчей, созданных до появления турнира в контракте, tournamentId пустой —
  // составы для них просто недоступны, отметка гола работает без автора.
  const enabled = Boolean(matchId && tournamentId && tournamentId !== EMPTY_GUID)

  const query = useQuery({
    queryKey: ['matchRosters', matchId],
    enabled,
    staleTime: 30_000,
    retry: 1,
    queryFn: async (): Promise<MatchRosters> => {
      const tournamentTeams = await rostersApi.listTeams(tournamentId)

      const homeTournamentTeam = tournamentTeams.find((team) => team.teamId === homeTeamId)
      const awayTournamentTeam = tournamentTeams.find((team) => team.teamId === awayTeamId)

      const [homeDetails, awayDetails] = await Promise.all([
        homeTournamentTeam ? rostersApi.getTeam(tournamentId, homeTournamentTeam.id) : null,
        awayTournamentTeam ? rostersApi.getTeam(tournamentId, awayTournamentTeam.id) : null,
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
            squadNumber: registration.squadNumber,
          }))
          .sort((left, right) => (left.squadNumber ?? 999) - (right.squadNumber ?? 999))

      return { home: toRoster(homeRegistrations), away: toRoster(awayRegistrations) }
    },
  })

  return {
    home: query.data?.home ?? [],
    away: query.data?.away ?? [],
    isLoading: query.isFetching,
  }
}
