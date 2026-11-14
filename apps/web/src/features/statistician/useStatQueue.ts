import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/shared/api/client'
import { errorMessage } from '@/shared/lib/errors'
import { statisticianApi, statisticianKeys } from './api'
import { isStatType, mergeEvents, voidedIds } from './statistics'
import type { MatchState, NewMatchEvent, StatType } from './types'

/** Как часто повторяем отправку, если связь пропала. */
const RETRY_MS = 4_000

const queueKey = (matchId: string) => `stathub.stats.queue.${matchId}`
const mineKey = (matchId: string) => `stathub.stats.mine.${matchId}`

function readList<T>(key: string): T[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeList(key: string, value: unknown[]): void {
  try {
    if (value.length === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Хранилище недоступно (приватный режим) — очередь живёт в памяти до закрытия вкладки.
  }
}

/** UUID события: randomUUID есть только в защищённом контексте (https/localhost). */
function createEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16)
  })
}

export interface RejectedStat {
  event: NewMatchEvent
  reason: string
}

/**
 * Очередь нажатий статистика. Нажатие сразу попадает в localStorage и в счётчик на экране,
 * а на сервер уходит батчем; при обрыве связи очередь повторяется сама и переживает перезагрузку
 * страницы. Сервер идемпотентен по Id события, поэтому повтор безопасен.
 *
 * «Отменить последнее» отменяет последнее нажатие с этого устройства событием EventVoided —
 * так же, как отмена в протоколе судьи; чужие нажатия (второго статистика) не трогает.
 */
export function useStatQueue(matchId: string, state: MatchState | undefined) {
  const queryClient = useQueryClient()

  const [pending, setPending] = useState<NewMatchEvent[]>(() => readList(queueKey(matchId)))
  const [mine, setMine] = useState<string[]>(() => readList(mineKey(matchId)))
  const [rejected, setRejected] = useState<RejectedStat[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  // Рефы — источник правды для асинхронной отправки: замыкания не должны видеть устаревшую очередь.
  const pendingRef = useRef(pending)
  const mineRef = useRef(mine)
  const inFlight = useRef(false)

  const commitPending = useCallback(
    (next: NewMatchEvent[]) => {
      pendingRef.current = next
      setPending(next)
      writeList(queueKey(matchId), next)
    },
    [matchId],
  )

  const commitMine = useCallback(
    (next: string[]) => {
      mineRef.current = next
      setMine(next)
      writeList(mineKey(matchId), next)
    },
    [matchId],
  )

  const flush = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setSending(true)

    try {
      // Пока шёл запрос, могли нажать ещё: отправляем, пока очередь не опустеет.
      while (pendingRef.current.length > 0) {
        const batch = pendingRef.current
        const result = await statisticianApi.append(matchId, batch)

        const reasons = new Map(result.rejectedEvents.map((item) => [item.eventId, item.reason]))
        const done = new Set([...result.acceptedEventIds, ...result.duplicateEventIds, ...reasons.keys()])

        commitPending(pendingRef.current.filter((event) => !done.has(event.id)))

        if (reasons.size > 0) {
          setRejected((current) => [
            ...current,
            ...batch
              .filter((event) => reasons.has(event.id))
              .map((event) => ({ event, reason: reasons.get(event.id) ?? '' })),
          ])
        }

        // Ответ свежее любого опроса, который мог стартовать до отправки.
        await queryClient.cancelQueries({ queryKey: statisticianKeys.state(matchId) })
        queryClient.setQueryData(statisticianKeys.state(matchId), result.state)
      }

      setProblem(null)
    } catch (error) {
      setProblem(
        error instanceof ApiError && error.status === 0
          ? 'Нет связи с сервером — нажатия сохранены и уйдут автоматически.'
          : `${errorMessage(error)} Нажатия сохранены, повторим отправку.`,
      )
    } finally {
      inFlight.current = false
      setSending(false)
    }
  }, [matchId, commitPending, queryClient])

  // Очередь с прошлого раза уходит сразу; дальше — повтор по таймеру и при возврате сети.
  useEffect(() => {
    void flush()

    const timer = window.setInterval(() => {
      if (pendingRef.current.length > 0) void flush()
    }, RETRY_MS)
    const onOnline = () => void flush()
    window.addEventListener('online', onOnline)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', onOnline)
    }
  }, [flush])

  const enqueue = (
    input: Pick<NewMatchEvent, 'type' | 'teamId' | 'targetEventId' | 'reason' | 'expectedGoals'>,
  ): NewMatchEvent => {
    const serverMax = state?.events.reduce((max, event) => Math.max(max, event.sequenceNumber), 0) ?? 0
    const localMax = pendingRef.current.reduce((max, event) => Math.max(max, event.sequenceNumber), 0)

    const event: NewMatchEvent = {
      ...input,
      id: createEventId(),
      clientTimestampUtc: new Date().toISOString(),
      sequenceNumber: Math.max(serverMax, localMax) + 1,
    }

    commitPending([...pendingRef.current, event])
    return event
  }

  /** Отметить событие; у удара — с xG выбранной опасности. */
  const record = (type: StatType, teamId: string, expectedGoals: number | null = null) => {
    const event = enqueue({ type, teamId, targetEventId: null, reason: null, expectedGoals })
    commitMine([...mineRef.current, event.id])
    void flush()
  }

  // Последнее своё нажатие, которое ещё действует: его и отменит кнопка.
  const merged = mergeEvents(state?.events ?? [], pending)
  const voided = voidedIds(merged)
  const byId = new Map(merged.map((event) => [event.id, event]))
  const lastId = [...mine].reverse().find((id) => {
    const event = byId.get(id)
    return event !== undefined && isStatType(event.type) && !voided.has(id)
  })
  const lastAction = lastId ? byId.get(lastId) : undefined

  const undo = () => {
    if (!lastAction) return
    enqueue({
      type: 'EventVoided',
      teamId: null,
      targetEventId: lastAction.id,
      reason: 'отменено статистиком',
      expectedGoals: null,
    })
    void flush()
  }

  return {
    pending,
    merged,
    lastAction,
    rejected,
    problem,
    sending,
    record,
    undo,
    dismissRejected: (eventId: string) =>
      setRejected((current) => current.filter((item) => item.event.id !== eventId)),
  }
}
