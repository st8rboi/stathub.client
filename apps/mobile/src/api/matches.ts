import { request } from './client'
import type { AppendEventsResult, Match, MatchState, NewMatchEvent } from './types'

/**
 * Эндпоинты модуля Matches.
 * Смена статуса матча — такие же события протокола, как голы: они идут через офлайн-очередь,
 * а домен сервера проверяет допустимость перехода.
 */
export const matchesApi = {
  getMatch: (id: string) => request<Match>('GET', `/matches/${id}`),

  /** Список матчей этапа в порядке расписания (GET /matches?stageId=...). */
  listByStage: (stageId: string) =>
    request<Match[]>('GET', `/matches?stageId=${encodeURIComponent(stageId)}`),

  /** Матч + протокол: независимый путь синхронизации, не зависящий от realtime-пуша. */
  getState: (id: string) => request<MatchState>('GET', `/matches/${id}/state`),

  /** Батч событий из офлайн-очереди; сервер идемпотентен по клиентскому UUID. */
  appendEvents: (id: string, events: NewMatchEvent[], sentAtUtc: string) =>
    request<AppendEventsResult>('POST', `/matches/${id}/events`, { events, sentAtUtc }),
}

/**
 * Проверка связи с сервером. Публичный список лиг — самый дешёвый эндпоинт,
 * который отвечает 200 и не требует токена.
 */
export const pingServer = () => request<unknown>('GET', '/public/leagues')
