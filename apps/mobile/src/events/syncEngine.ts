import type { QueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { AppState } from 'react-native'

import { ApiError } from '../api/client'
import { matchesApi } from '../api/matches'
import type { NewMatchEvent } from '../api/types'
import { getCachedAccessToken } from '../auth/tokens'
import { cacheKeys, writeCache } from '../storage/offlineCache'
import { rememberMatch } from '../storage/recentMatches'
import {
  addRejectedEvents,
  dismissRejectedEvent,
  listOutboxMatchIds,
  loadOutbox,
  loadRejectedEvents,
  removeEvents,
  type RejectedEvent,
} from './outbox'

/**
 * Отправка офлайн-очереди. Работает на уровне приложения, а не экрана матча: судья может
 * уйти с экрана или перезапустить приложение, события всё равно уйдут, пока оно открыто.
 * Фоновой отправки нет: без открытого приложения очередь ждёт следующего запуска.
 */
const BATCH_SIZE = 20
const RETRY_INTERVAL_MS = 15_000

export type SyncProblem = {
  /** offline — нет связи, session — нужен вход, access — матч недоступен, server — ошибка сервера. */
  kind: 'offline' | 'session' | 'access' | 'server'
  message: string
}

export type MatchSyncState = {
  pending: NewMatchEvent[]
  rejected: RejectedEvent[]
  problem: SyncProblem | null
  isSending: boolean
}

export const matchStateQueryKey = (id: string) => ['matchState', id] as const

const EMPTY: MatchSyncState = { pending: [], rejected: [], problem: null, isSending: false }

const store = new Map<string, MatchSyncState>()
const listeners = new Set<() => void>()

let overview = { pending: 0, rejected: 0, problem: null as SyncProblem | null }
let queryClient: QueryClient | null = null
let isRunning = false
let runAgain = false

function update(matchId: string, patch: Partial<MatchSyncState>): void {
  store.set(matchId, { ...(store.get(matchId) ?? EMPTY), ...patch })

  const states = [...store.values()]
  overview = {
    pending: states.reduce((sum, state) => sum + state.pending.length, 0),
    rejected: states.reduce((sum, state) => sum + state.rejected.length, 0),
    problem: states.find((state) => state.problem)?.problem ?? null,
  }

  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useMatchSync(matchId: string): MatchSyncState {
  return useSyncExternalStore(subscribe, () => store.get(matchId) ?? EMPTY)
}

export function useSyncOverview() {
  return useSyncExternalStore(subscribe, () => overview)
}

export async function loadMatchSync(matchId: string): Promise<void> {
  const [pending, rejected] = await Promise.all([loadOutbox(matchId), loadRejectedEvents(matchId)])
  update(matchId, { pending, rejected })
}

export function setPendingEvents(matchId: string, pending: NewMatchEvent[]): void {
  update(matchId, { pending })
}

export async function dismissRejected(matchId: string, eventId: string): Promise<void> {
  update(matchId, { rejected: await dismissRejectedEvent(matchId, eventId) })
}

function toProblem(error: unknown): SyncProblem {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return { kind: 'offline', message: 'Нет связи с сервером.' }
    if (error.status === 401) return { kind: 'session', message: 'Сессия истекла. Войдите заново.' }
    if (error.status === 403 || error.status === 404) {
      return {
        kind: 'access',
        message: 'Матч вам больше не назначен. События сохранены на устройстве: свяжитесь с организатором.',
      }
    }
    return { kind: 'server', message: error.message }
  }

  return { kind: 'server', message: 'Не удалось отправить события.' }
}

/** @returns false, если дальше отправлять бессмысленно: нет связи или закончилась сессия. */
async function syncMatch(matchId: string): Promise<boolean> {
  for (;;) {
    const pending = await loadOutbox(matchId)
    const batch = [...pending].sort((left, right) => left.sequenceNumber - right.sequenceNumber).slice(0, BATCH_SIZE)

    if (batch.length === 0) {
      update(matchId, { pending, problem: null, isSending: false })
      return true
    }

    update(matchId, { pending, isSending: true })

    try {
      const result = await matchesApi.appendEvents(matchId, batch, new Date().toISOString())

      // Ответ сервера — новое истинное состояние (счёт-проекция и протокол).
      queryClient?.setQueryData(matchStateQueryKey(matchId), result.state)
      await writeCache(cacheKeys.matchState(matchId), result.state)
      await rememberMatch(result.state.match)

      const eventsById = new Map(batch.map((event) => [event.id, event]))
      const rejected = result.rejectedEvents.flatMap(({ eventId, reason }) => {
        const event = eventsById.get(eventId)
        return event ? [{ event, reason }] : []
      })

      const allRejected = await addRejectedEvents(matchId, rejected)
      const handled = [...result.acceptedEventIds, ...result.duplicateEventIds, ...rejected.map((item) => item.event.id)]
      const next = await removeEvents(matchId, handled)

      update(matchId, { pending: next, rejected: allRejected, problem: null, isSending: false })

      // Защита от вечного цикла: сервер обязан разобрать хотя бы одно событие батча.
      if (handled.length === 0) return true
    } catch (error) {
      const problem = toProblem(error)
      update(matchId, { problem, isSending: false })
      return problem.kind !== 'offline' && problem.kind !== 'session'
    }
  }
}

/** Запускает отправку всех очередей; повторный вызов во время отправки не теряется. */
export async function requestSync(): Promise<void> {
  if (isRunning) {
    runAgain = true
    return
  }

  if (!getCachedAccessToken()) return

  isRunning = true

  try {
    do {
      runAgain = false

      for (const matchId of await listOutboxMatchIds()) {
        if (!store.has(matchId)) await loadMatchSync(matchId)
        if (!(await syncMatch(matchId))) break
      }
    } while (runAgain)
  } finally {
    isRunning = false
  }
}

export function startOutboxSync(client: QueryClient): () => void {
  queryClient = client

  void listOutboxMatchIds().then(async (ids) => {
    await Promise.all(ids.map(loadMatchSync))
    await requestSync()
  })

  const timer = setInterval(() => void requestSync(), RETRY_INTERVAL_MS)
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') void requestSync()
  })

  return () => {
    clearInterval(timer)
    subscription.remove()
  }
}
