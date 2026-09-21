import { request } from '@/shared/api/client'
import type {
  AddStageBody,
  CreateTournamentBody,
  Tournament,
  TournamentAction,
  TournamentSummary,
} from './types'

export const tournamentsApi = {
  list: (leagueId: string) => request<TournamentSummary[]>('GET', `/leagues/${leagueId}/tournaments`),
  get: (leagueId: string, id: string) => request<Tournament>('GET', `/leagues/${leagueId}/tournaments/${id}`),
  create: (leagueId: string, body: CreateTournamentBody) =>
    request<{ id: string }>('POST', `/leagues/${leagueId}/tournaments`, body),
  addStage: (leagueId: string, tournamentId: string, body: AddStageBody) =>
    request<{ id: string }>('POST', `/leagues/${leagueId}/tournaments/${tournamentId}/stages`, body),
  changeStatus: (leagueId: string, tournamentId: string, action: TournamentAction) =>
    request<void>('POST', `/leagues/${leagueId}/tournaments/${tournamentId}/${action}`),
}
