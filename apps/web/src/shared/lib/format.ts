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
