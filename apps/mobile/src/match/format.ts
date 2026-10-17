/** Форматирование и разбор значений для экранов судьи. */

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const UUID_FULL_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function shortId(id: string, length = 8): string {
  return id ? id.slice(0, length) : ''
}

export function isUuid(value: string): boolean {
  return UUID_FULL_PATTERN.test(value.trim())
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

/**
 * Разбор даты и времени из полей ввода (локальные дата/время устройства).
 * Возвращает null для несуществующих дат вроде 31.02, а не «3 марта».
 */
export function parseLocalDateTime(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim())
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time.trim())
  if (!dateMatch || !timeMatch) return null

  const [year, month, day] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])]
  const [hours, minutes] = [Number(timeMatch[1]), Number(timeMatch[2])]

  const result = new Date(year, month - 1, day, hours, minutes, 0, 0)
  if (Number.isNaN(result.getTime())) return null
  if (result.getMonth() !== month - 1 || result.getDate() !== day) return null
  if (result.getHours() !== hours || result.getMinutes() !== minutes) return null

  return result
}

export function currentDateInput(): string {
  const now = new Date()
  return [
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

export function currentTimeInput(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}
