import { useCallback, useEffect, useState } from 'react'

import { matchesApi } from '../api/matches'
import type { Match, MatchState, NewMatchEvent } from '../api/types'
import { appendEvent } from '../events/outbox'
import { createEventId } from '../events/projection'
import {
  dismissRejected,
  loadMatchSync,
  matchStateQueryKey,
  requestSync,
  setPendingEvents,
  useMatchSync,
} from '../events/syncEngine'
import { cacheKeys } from '../storage/offlineCache'
import { findRecentMatch, rememberMatch } from '../storage/recentMatches'
import { usePersistedQuery } from './usePersistedQuery'

/**
 * Состояние матча (матч + протокол) с сервера. Без связи экран работает на последнем
 * сохранённом снимке, а поверх него накладывается очередь устройства.
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

  const query = usePersistedQuery({
    cacheKey: cacheKeys.matchState(id),
    queryKey: matchStateQueryKey(id),
    queryFn: () => matchesApi.getState(id),
    enabled: Boolean(id),
    staleTime: 0,
  })

  useEffect(() => {
    if (query.data) void rememberMatch(query.data.match)
  }, [query.data])

  return { ...query, cachedMatch }
}

type NewEventInput = Omit<NewMatchEvent, 'id' | 'clientTimestampUtc' | 'sequenceNumber'>

/**
 * Запись в офлайн-очередь: действие судьи попадает в AsyncStorage сразу и сразу видно на экране,
 * а отправкой занимается общий движок (см. syncEngine), независимо от открытого экрана.
 */
export function useMatchEvents(matchId: string, state: MatchState | undefined) {
  const sync = useMatchSync(matchId)
  const [storageError, setStorageError] = useState<string | null>(null)

  useEffect(() => {
    void loadMatchSync(matchId)
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

        setStorageError(null)
        setPendingEvents(matchId, events)
        void requestSync()
      } catch {
        // Крайний случай (хранилище недоступно): не роняем экран, а показываем проблему судье.
        setStorageError('Не удалось сохранить событие на устройстве')
      }
    },
    [matchId, serverMaxSequence],
  )

  return {
    ...sync,
    storageError,
    enqueue,
    dismissRejected: (eventId: string) => dismissRejected(matchId, eventId),
  }
}
