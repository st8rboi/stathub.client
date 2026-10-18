export type TournamentTeamStatus = 'Active' | 'Withdrawn'
export type PlayerRegistrationStatus = 'Active' | 'TransferredOut' | 'Released'

export interface TournamentTeam {
  id: string
  tournamentId: string
  teamId: string
  status: TournamentTeamStatus
  activePlayers: number
  createdAtUtc: string
}

export interface PlayerRegistration {
  id: string
  playerId: string
  squadNumber: number | null
  status: PlayerRegistrationStatus
  joinedOn: string
  leftOn: string | null
}

export interface TournamentTeamDetails {
  id: string
  tournamentId: string
  teamId: string
  status: TournamentTeamStatus
  registrations: PlayerRegistration[]
}
