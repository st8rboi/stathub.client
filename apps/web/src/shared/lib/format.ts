/** Дата без времени из API ('YYYY-MM-DD') — разбираем как местную, чтобы не съехать на день из-за UTC. */
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })

/** «12 мар. 2026 г.» для даты 'YYYY-MM-DD' или ISO-строки с временем. */
export function formatDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDateOnly(value) : new Date(value)
  return dateFormat.format(date)
}

/** Период турнира: «12 мар. 2026 г. — 30 мая 2026 г.» или «с 12 мар. 2026 г.», если конца нет. */
export function formatDateRange(start: string, end: string | null): string {
  return end ? `${formatDate(start)} — ${formatDate(end)}` : `с ${formatDate(start)}`
}

/** Русское склонение после числа: plural(3, ['турнир', 'турнира', 'турниров']) → «3 турнира». */
export function plural(count: number, forms: [one: string, few: string, many: string]): string {
  const mod10 = count % 10
  const mod100 = count % 100
  const form =
    mod10 === 1 && mod100 !== 11 ? forms[0] : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? forms[1] : forms[2]
  return `${count} ${form}`
}

const moneyFormat = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })

/** Сумма в рублях: «12 500 ₽». */
export function formatMoney(amount: number): string {
  return moneyFormat.format(amount)
}

const pad = (value: number) => String(value).padStart(2, '0')

const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

/** Время «19:00» в местном часовом поясе. */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

/** Ключ местного дня 'YYYY-MM-DD' — для группировки по датам. */
export function dayKey(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Значение для <input type="datetime-local"> (местное время). */
export function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const dayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
const dayFormatWithYear = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const DAY_MS = 24 * 60 * 60 * 1000

/** Заголовок дня: «Сегодня, ср, 12 ноября», «Пт, 14 ноября», год — только если не текущий. */
export function formatDayHeading(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const startOf = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const diffDays = Math.round((startOf(date) - startOf(now)) / DAY_MS)

  const text = (date.getFullYear() === now.getFullYear() ? dayFormat : dayFormatWithYear).format(date)
  const relative = diffDays === 0 ? 'Сегодня' : diffDays === 1 ? 'Завтра' : diffDays === -1 ? 'Вчера' : null
  return relative ? `${relative}, ${text}` : text.charAt(0).toUpperCase() + text.slice(1)
}

/** Полных лет на сегодня по дате рождения 'YYYY-MM-DD'. */
export function ageFromBirthDate(birthDate: string): number {
  const [year, month, day] = birthDate.split('-').map(Number)
  const now = new Date()
  const hadBirthday = now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() >= day)
  return now.getFullYear() - year - (hadBirthday ? 0 : 1)
}
