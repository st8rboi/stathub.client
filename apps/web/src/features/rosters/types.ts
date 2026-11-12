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
