import type { PublicMatch } from '@/api/types'
import { isLiveMatch } from '@/labels'

/**
 * Тур этапа. В данных номера тура нет, поэтому тур выводим из календаря: у любительских лиг
 * тур — это игровые выходные, а между турами неделя. Матчи, между днями которых меньше
 * {@link ROUND_GAP_DAYS} дней, попадают в один тур. Перенесённый матч уходит в тур своей новой даты.
 */
export type Round = {
  key: string
  number: number
  matches: PublicMatch[]
  /** Первый и последний день тура (локальная полночь). */
  firstDay: Date
  lastDay: Date
}

const DAY_MS = 86_400_000
export const ROUND_GAP_DAYS = 3

function localDay(iso: string): Date {
  const date = new Date(iso)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const dayDiff = (later: Date, earlier: Date) => Math.round((later.getTime() - earlier.getTime()) / DAY_MS)

export function splitIntoRounds(matches: PublicMatch[]): Round[] {
  const sorted = [...matches].sort(
    (left, right) => new Date(left.scheduledTimeUtc).getTime() - new Date(right.scheduledTimeUtc).getTime(),
  )
  const rounds: Round[] = []

  for (const match of sorted) {
    const day = localDay(match.scheduledTimeUtc)
    const current = rounds.at(-1)

    if (current && dayDiff(day, current.lastDay) < ROUND_GAP_DAYS) {
      current.matches.push(match)
      current.lastDay = day
      continue
    }

    rounds.push({
      key: `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`,
      number: rounds.length + 1,
      matches: [match],
      firstDay: day,
      lastDay: day,
    })
  }

  return rounds
}

/**
 * Тур, который открывать по умолчанию: где идёт матч; иначе только что сыгранный
 * (закончился не раньше чем позавчера) — зритель приходит за результатами; иначе ближайший
 * будущий; если будущих нет — последний.
 */
export function currentRound(rounds: Round[], now = new Date()): Round | undefined {
  if (rounds.length === 0) return undefined

  const live = rounds.find((round) => round.matches.some((match) => isLiveMatch(match.status)))
  if (live) return live

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return rounds.find((round) => dayDiff(round.lastDay, today) >= -2) ?? rounds.at(-1)
}

/** «12.10» или «12–13.10» / «31.10–01.11». */
export function roundDates(round: Round): string {
  const format = (date: Date, withMonth = true) =>
    withMonth
      ? date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
      : date.toLocaleDateString('ru-RU', { day: '2-digit' })

  if (round.firstDay.getTime() === round.lastDay.getTime()) return format(round.firstDay)

  const sameMonth = round.firstDay.getMonth() === round.lastDay.getMonth()
  return `${format(round.firstDay, !sameMonth)}–${format(round.lastDay)}`
}
