import { request } from './client'
import type { CreateMatchRequest, Match } from './types'

/**
 * Эндпоинты модуля Matches.
 * Жизненный цикл матча — отдельные POST-действия, а не PATCH статуса:
 * домен сам проверяет допустимость перехода (`Match.Start/Stop/Resume/...`).
 */
export const matchesApi = {
  getMatch: (id: string) => request<Match>('GET', `/matches/${id}`),

  /** Список матчей этапа в порядке расписания (GET /matches?stageId=...). */
  listByStage: (stageId: string) =>
    request<Match[]>('GET', `/matches?stageId=${encodeURIComponent(stageId)}`),

  createMatch: (payload: CreateMatchRequest) => request<{ id: string }>('POST', '/matches', payload),

  start: (id: string) => request<void>('POST', `/matches/${id}/start`),
  stop: (id: string) => request<void>('POST', `/matches/${id}/stop`),
  resume: (id: string) => request<void>('POST', `/matches/${id}/resume`),
  nextPeriod: (id: string) => request<void>('POST', `/matches/${id}/next-period`),
  finish: (id: string) => request<void>('POST', `/matches/${id}/finish`),
}

/**
 * Проверка связи с сервером. Публичный список лиг — самый дешёвый эндпоинт,
 * который отвечает 200 и не требует идентификаторов.
 */
export const pingServer = () => request<unknown>('GET', '/leagues')
