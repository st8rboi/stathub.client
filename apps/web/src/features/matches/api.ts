import { request } from '@/shared/api/client'
import type { AppendEventsResult, CreateMatchBody, Match, MatchState, NewProtocolEvent, UpdateMatchBody } from './types'

export const matchesApi = {
  listByStage: (stageId: string) =>
    request<Match[]>('GET', `/matches?stageId=${encodeURIComponent(stageId)}`),
  create: (body: CreateMatchBody) => request<{ id: string }>('POST', '/matches', body),
  update: (id: string, body: UpdateMatchBody) => request<Match>('PUT', `/matches/${id}`, body),
  remove: (id: string) => request<void>('DELETE', `/matches/${id}`),
  /** Отмена матча (начат по ошибке или не состоялся): протокол остаётся, матч уходит из таблицы. */
  cancel: (id: string) => request<Match>('POST', `/matches/${id}/cancel`),
  /** Матч и протокол целиком. */
  state: (id: string) => request<MatchState>('GET', `/matches/${id}/state`),
  /**
   * События от организатора. Время событий считается по часам сервера (из протокола),
   * поэтому sentAtUtc не передаём: иначе сервер «поправил» бы его на расхождение часов браузера.
   */
  appendEvents: (id: string, events: NewProtocolEvent[]) =>
    request<AppendEventsResult>('POST', `/matches/${id}/events`, { events }),
}
