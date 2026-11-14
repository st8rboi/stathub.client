export type TournamentTeamStatus = 'Active' | 'Withdrawn'
export type PlayerRegistrationStatus = 'Active' | 'TransferredOut' | 'Released'

export interface TournamentTeam {
  id: string
  /** Дивизион заявки — по нему идут все изменения состава. */
  divisionId: string
  tournamentId: string
  teamId: string
  status: TournamentTeamStatus
  activePlayers: number
  createdAtUtc: string
}

/** Заявка команды в другом турнире, из которой можно скопировать состав. */
export interface RosterSource {
  tournamentTeamId: string
  tournamentId: string
  tournamentName: string
  divisionId: string
  divisionName: string
  leagueName: string
  status: TournamentTeamStatus
  /** Сколько игроков будет скопировано. */
  activePlayers: number
  createdAtUtc: string
}

export interface AddTournamentTeamResult {
  id: string
  copiedPlayers: number
  /** Игроки источника, уже заявленные за другую команду этого турнира. */
  skippedPlayerIds: string[]
}

export interface PlayerRegistration {
  id: string
  playerId: string
  status: PlayerRegistrationStatus
  joinedOn: string
  leftOn: string | null
}

export interface TournamentTeamDetails {
  id: string
  /** Дивизион заявки — по нему идут все изменения состава. */
  divisionId: string
  tournamentId: string
  teamId: string
  status: TournamentTeamStatus
  registrations: PlayerRegistration[]
}
