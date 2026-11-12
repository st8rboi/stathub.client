import { request } from '@/shared/api/client'
import type {
  AddStageBody,
  CreateTournamentBody,
  StageBody,
  StageGroupBody,
  Tournament,
  TournamentAction,
  TournamentSummary,
  UpdateTournamentBody,
} from './types'

const base = (leagueId: string, tournamentId: string) => `/leagues/${leagueId}/tournaments/${tournamentId}`

export const tournamentsApi = {
  list: (leagueId: string) => request<TournamentSummary[]>('GET', `/leagues/${leagueId}/tournaments`),
  get: (leagueId: string, id: string) => request<Tournament>('GET', base(leagueId, id)),
  create: (leagueId: string, body: CreateTournamentBody) =>
    request<{ id: string }>('POST', `/leagues/${leagueId}/tournaments`, body),
  update: (leagueId: string, id: string, body: UpdateTournamentBody) =>
    request<Tournament>('PUT', base(leagueId, id), body),
  remove: (leagueId: string, id: string) => request<void>('DELETE', base(leagueId, id)),
  updateStage: (leagueId: string, tournamentId: string, stageId: string, body: StageBody) =>
    request<void>('PUT', `${base(leagueId, tournamentId)}/stages/${stageId}`, body),
  removeStage: (leagueId: string, tournamentId: string, stageId: string) =>
    request<void>('DELETE', `${base(leagueId, tournamentId)}/stages/${stageId}`),
  addStage: (leagueId: string, tournamentId: string, body: AddStageBody) =>
    request<{ id: string }>('POST', `${base(leagueId, tournamentId)}/stages`, body),
  addDivision: (leagueId: string, tournamentId: string, name: string) =>
    request<{ id: string }>('POST', `${base(leagueId, tournamentId)}/divisions`, { name }),
  renameDivision: (leagueId: string, tournamentId: string, divisionId: string, name: string) =>
    request<void>('PUT', `${base(leagueId, tournamentId)}/divisions/${divisionId}`, { name }),
  removeDivision: (leagueId: string, tournamentId: string, divisionId: string) =>
    request<void>('DELETE', `${base(leagueId, tournamentId)}/divisions/${divisionId}`),
  addStageGroup: (leagueId: string, tournamentId: string, stageId: string, body: StageGroupBody) =>
    request<{ id: string }>('POST', `${base(leagueId, tournamentId)}/stages/${stageId}/groups`, body),
  updateStageGroup: (
    leagueId: string,
    tournamentId: string,
    stageId: string,
    groupId: string,
    body: StageGroupBody,
  ) => request<void>('PUT', `${base(leagueId, tournamentId)}/stages/${stageId}/groups/${groupId}`, body),
  removeStageGroup: (leagueId: string, tournamentId: string, stageId: string, groupId: string) =>
    request<void>('DELETE', `${base(leagueId, tournamentId)}/stages/${stageId}/groups/${groupId}`),
  changeStatus: (leagueId: string, tournamentId: string, action: TournamentAction) =>
    request<void>('POST', `${base(leagueId, tournamentId)}/${action}`),
}
