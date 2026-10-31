import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Поправка к часам устройства. Времена матча приходят по часам сервера, поэтому секундомер
 * на телефоне с неверными часами считал бы неправильно. Поправка берётся из заголовка Date
 * ответов сервера и сохраняется: без сети используется последняя известная.
 */
const OFFSET_KEY = '@stathub/serverClockOffset'

// Заголовок Date точен до секунды: мелкие колебания не должны дёргать секундомер.
const MIN_CHANGE_MS = 2_000

let offsetMs = 0

export async function loadServerClockOffset(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OFFSET_KEY)
    const parsed = raw === null ? Number.NaN : Number(raw)
    if (Number.isFinite(parsed)) offsetMs = parsed
  } catch {
    // Без сохранённой поправки секундомер считает по часам устройства.
  }
}

export function noteServerDate(header: string | null): void {
  if (!header) return

  const serverMs = new Date(header).getTime()
  if (Number.isNaN(serverMs)) return

  const next = serverMs - Date.now()
  if (Math.abs(next - offsetMs) < MIN_CHANGE_MS) return

  offsetMs = next
  void AsyncStorage.setItem(OFFSET_KEY, String(next)).catch(() => undefined)
}

export function serverClockOffsetMs(): number {
  return offsetMs
}

export function serverNowMs(): number {
  return Date.now() + offsetMs
}
