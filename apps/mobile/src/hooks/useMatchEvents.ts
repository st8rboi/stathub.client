import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import { matchesApi } from '../api/matches'
import type { Match, MatchState, NewMatchEvent } from '../api/types'
import { appendEvent, loadOutbox, removeEvents } from '../events/outbox'
import { createEventId } from '../events/projection'
import { findRecentMatch, rememberMatch } from '../storage/recentMatches'

export const matchStateQueryKey = (id: string) => ['matchState', id] as const

/** Размер порции очереди: сервер принимает батч, остальное уйдёт следующим запросом. */
const BATCH_SIZE = 20
const RETRY_INTERVAL_MS = 15_000

/**
 * Состояние матча (матч + протокол). Это единственный источник счёта на экране:
 * после каждой успешной отправки батча сюда кладётся ответ сервера.
 */
export function useMatchStateQuery(id: string) {
  const [cachedMatch, setCachedMatch] = useState<Match | null>(null)

  useEffect(() => {
    let active = true
    void findRecentMatch(id).then((match) => {
      if (active && match) setCachedMatch(match)
    })

    return () => {
      active = false
    }
  }, [id])

  const query = useQuery({
    queryKey: matchStateQueryKey(id),
    queryFn: () => matchesApi.getState(id),
    enabled: Boolean(id),
    staleTime: 0,
    retry: 1,
  })

  useEffect(() => {
    if (query.data) void rememberMatch(query.data.match)
  }, [query.data])

  return { ...query, cachedMatch }
}

type NewEventInput = Omit<NewMatchEvent, 'id' | 'clientTimestampUtc' | 'sequenceNumber'>

/**
 * Офлайн-очередь матча: событие попадает в AsyncStorage сразу и показывается в протоколе,
 * а на сервер уходит, когда есть связь. Если связи нет — очередь ждёт и повторяет попытку.
 */
export function useMatchEvents(matchId: string, state: MatchState | undefined) {
  const queryClient = useQueryClient()

  const [pending, setPending] = useState<NewMatchEvent[]>([])
  const [lastError, setLastError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  const syncingRef = useRef(false)

  useEffect(() => {
    let active = true
    void loadOutbox(matchId).then((items) => {
      if (active) setPending(items)
    })

    return () => {
      active = false
    }
  }, [matchId])

  const serverMaxSequence =
    state?.events.reduce((max, event) => Math.max(max, event.sequenceNumber), 0) ?? 0

  const enqueue = useCallback(
    async (input: NewEventInput) => {
      try {
        const { events } = await appendEvent(
          matchId,
          {
            ...input,
            id: createEventId(),
            clientTimestampUtc: new Date().toISOString(),
          },
          serverMaxSequence,
        )

        setPending(events)
      } catch {
        // Крайний случай (хранилище недоступно): не роняем экран, а показываем проблему судье.
        setLastError('Не удалось сохранить событие на устройстве')
      }
    },
    [matchId, serverMaxSequence],
  )

  const sync = useCallback(async () => {
    if (syncingRef.current || pending.length === 0) return

    syncingRef.current = true
    setIsSending(true)
    setLastError(null)

    try {
      const batch = [...pending]
        .sort((left, right) => left.sequenceNumber - right.sequenceNumber)
        .slice(0, BATCH_SIZE)

      const result = await matchesApi.appendEvents(matchId, batch)

      // Ответ сервера — новое истинное состояние (счёт-проекция и протокол).
      queryClient.setQueryData(matchStateQueryKey(matchId), result.state)

      const sent = [...result.acceptedEventIds, ...result.duplicateEventIds]
      setPending(await removeEvents(matchId, sent))
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Не удалось отправить события')
    } finally {
      syncingRef.current = false
      setIsSending(false)
    }
  }, [matchId, pending, queryClient])

  // Отправляем сразу после постановки в очередь; после ошибки ждём таймер, чтобы не спамить сервер.
  useEffect(() => {
    if (pending.length > 0 && lastError === null) {
      void sync()
    }
  }, [pending.length, lastError, sync])

  useEffect(() => {
    if (pending.length === 0) return

    const timer = setInterval(() => void sync(), RETRY_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [pending.length, sync])

  return { pending, lastError, isSending, enqueue, sync }
}
