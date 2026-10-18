import AsyncStorage from '@react-native-async-storage/async-storage'

import type { NewMatchEvent } from '../api/types'

/**
 * Офлайн-очередь событий матча.
 *
 * Судья на поле может потерять сеть на несколько минут: событие сразу пишется сюда и в UI,
 * а на сервер уходит, когда связь появится. Сервер идемпотентен по клиентскому UUID,
 * поэтому повторная отправка безопасна.
 */
const outboxKey = (matchId: string) => `@stathub/outbox/${matchId}`

// Записи в очередь сериализуются: иначе параллельные sync и «добавить событие»
// могли бы перезаписать друг друга.
let queue: Promise<unknown> = Promise.resolve()

function serialize<T>(action: () => Promise<T>): Promise<T> {
  const run = queue.then(action, action)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function loadOutbox(matchId: string): Promise<NewMatchEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(outboxKey(matchId))
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isNewMatchEvent)
  } catch {
    return []
  }
}

function isNewMatchEvent(value: unknown): value is NewMatchEvent {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<NewMatchEvent>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.sequenceNumber === 'number' &&
    typeof candidate.clientTimestampUtc === 'string'
  )
}

async function writeOutbox(matchId: string, events: NewMatchEvent[]): Promise<void> {
  await AsyncStorage.setItem(outboxKey(matchId), JSON.stringify(events))
}

export function appendEvent(
  matchId: string,
  input: Omit<NewMatchEvent, 'sequenceNumber'>,
  serverMaxSequence: number,
): Promise<{ event: NewMatchEvent; events: NewMatchEvent[] }> {
  return serialize(async () => {
    const current = await loadOutbox(matchId)

    // Номер берём под замком очереди: два быстрых нажатия не получат одинаковый SequenceNumber.
    const localMaxSequence = current.reduce((max, item) => Math.max(max, item.sequenceNumber), 0)
    const event: NewMatchEvent = {
      ...input,
      sequenceNumber: Math.max(localMaxSequence, serverMaxSequence) + 1,
    }

    const next = [...current.filter((item) => item.id !== event.id), event]
    await writeOutbox(matchId, next)
    return { event, events: next }
  })
}

export function removeEvents(matchId: string, ids: string[]): Promise<NewMatchEvent[]> {
  return serialize(async () => {
    if (ids.length === 0) return loadOutbox(matchId)

    const accepted = new Set(ids)
    const next = (await loadOutbox(matchId)).filter((item) => !accepted.has(item.id))
    await writeOutbox(matchId, next)
    return next
  })
}
