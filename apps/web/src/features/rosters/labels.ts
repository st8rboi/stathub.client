import type { PlayerRegistrationStatus, TournamentTeamStatus } from './types'

export const tournamentTeamStatusLabels: Record<TournamentTeamStatus, string> = {
  Active: 'Участвует',
  Withdrawn: 'Снята с турнира',
}

export const registrationStatusLabels: Record<PlayerRegistrationStatus, string> = {
  Active: 'Заявлен',
  TransferredOut: 'Перешёл в другую команду',
  Released: 'Отзаявлен',
}
