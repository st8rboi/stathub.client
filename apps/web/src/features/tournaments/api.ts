import { request } from '@/shared/api/client'
import type {
  AddStageBody,
  CreateTournamentBody,
  Tournament,
  TournamentAction,
  TournamentSummary,
  UpdateTournamentBody,
} from './types'

export const tournamentsApi = {
  list: (leagueId: string) => request<TournamentSummary[]>('GET', `/leagues/${leagueId}/tournaments`),
  get: (leagueId: string, id: string) => request<Tournament>('GET', `/leagues/${leagueId}/tournaments/${id}`),
  create: (leagueId: string, body: CreateTournamentBody) =>
    request<{ id: string }>('POST', `/leagues/${leagueId}/tournaments`, body),
  update: (leagueId: string, id: string, body: UpdateTournamentBody) =>
    request<Tournament>('PUT', `/leagues/${leagueId}/tournaments/${id}`, body),
  remove: (leagueId: string, id: string) => request<void>('DELETE', `/leagues/${leagueId}/tournaments/${id}`),
  updateStage: (leagueId: string, tournamentId: string, stageId: string, body: AddStageBody) =>
    request<void>('PUT', `/leagues/${leagueId}/tournaments/${tournamentId}/stages/${stageId}`, body),
  removeStage: (leagueId: string, tournamentId: string, stageId: string) =>
    request<void>('DELETE', `/leagues/${leagueId}/tournaments/${tournamentId}/stages/${stageId}`),
  addStage: (leagueId: string, tournamentId: string, body: AddStageBody) =>
    request<{ id: string }>('POST', `/leagues/${leagueId}/tournaments/${tournamentId}/stages`, body),
  changeStatus: (leagueId: string, tournamentId: string, action: TournamentAction) =>
    request<void>('POST', `/leagues/${leagueId}/tournaments/${tournamentId}/${action}`),
}
