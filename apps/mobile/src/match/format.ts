/** Форматирование и разбор значений для экранов судьи. */

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

export function shortId(id: string, length = 8): string {
  return id ? id.slice(0, length) : ''
}

/** Достаёт GUID из произвольного текста: QR может содержать ссылку вида stathub://match/<guid>. */
export function extractUuid(value: string): string | null {
  const found = UUID_PATTERN.exec(value)
  return found ? found[0].toLowerCase() : null
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Секундомер периода: мм:сс, минуты не обрезаются (45:00, 90:00). */
export function formatClock(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

