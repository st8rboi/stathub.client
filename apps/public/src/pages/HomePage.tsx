import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { PublicMatch } from '@/api/types'
import { CompetitionGroup, type Competition } from '@/components/CompetitionGroup'
import { StandingsPanel } from '@/components/StandingsPanel'
import { useLeagues, useSchedule } from '@/hooks'
import { useRealtime } from '@/realtime'

const DAY_MS = 86_400_000

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function dayKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function dayLabel(date: Date, today: Date): string {
  const diff = Math.round((startOfDay(date).getTime() - today.getTime()) / DAY_MS)

  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Завтра'

  return date.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export default function HomePage() {
  const queryClient = useQueryClient()

  const [today] = useState(() => startOfDay(new Date()))
  const [selectedKey, setSelectedKey] = useState(() => dayKey(startOfDay(new Date())))

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => new Date(today.getTime() + index * DAY_MS)),
    [today],
  )

  const schedule = useSchedule(today, new Date(today.getTime() + 7 * DAY_MS))
  const leagues = useLeagues('', '')

  const matches = schedule.data ?? []

  // Один запрос на неделю: из него считаем счётчики для полосы дат и матчи выбранного дня.
  const byDay = useMemo(() => {
    const map = new Map<string, PublicMatch[]>()

    for (const match of matches) {
      const key = dayKey(new Date(match.scheduledTimeUtc))
      const bucket = map.get(key) ?? []
      bucket.push(match)
      map.set(key, bucket)
    }

    return map
  }, [matches])

  const cityBySlug = useMemo(
    () => new Map((leagues.data ?? []).map((league) => [league.slug, league.city])),
    [leagues.data],
  )

  const dayMatches = (byDay.get(selectedKey) ?? []).filter((match) => match.leagueSlug !== '')

  const competitions = useMemo<Competition[]>(() => {
    const map = new Map<string, Competition>()

    for (const match of dayMatches) {
      const existing = map.get(match.leagueSlug)

      if (existing) {
        existing.matches.push(match)
        continue
      }

      map.set(match.leagueSlug, {
        slug: match.leagueSlug,
        name: match.leagueName,
        logoUrl: match.leagueLogoUrl,
        city: cityBySlug.get(match.leagueSlug) ?? null,
        matches: [match],
      })
    }

    return [...map.values()]
  }, [dayMatches, cityBySlug])

  // Push — сигнал «перечитай расписание»; сам список всегда из REST (doc §4).
  useRealtime({}, () => {
    void queryClient.invalidateQueries({ queryKey: ['public'] })
  })

  const liveCount = matches.filter(
    (match) => match.status === 'InProgress' || match.status === 'Pause',
  ).length

  return (
    <>
      <section className="hero">
        <div className="hero-main">
          <h1>Матчи, таблицы и статистика любительского футбола</h1>
          <p className="hero-date">
            {today.toLocaleDateString('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <p className="hero-text">
            Live-счёт от судей, расписание по дням и турнирные таблицы — от всех лиг платформы
            в одном месте.
          </p>
        </div>

        <aside className="hero-card">
          <span className="hero-card-label">Live-счёт</span>
          <h2>Результаты появляются сразу после события судьи</h2>
          <p>Гол, карточка или смена статуса — и таблица со счётом обновляются автоматически.</p>
          <p className="hero-card-live">
            {liveCount > 0 ? `Сейчас идёт матчей: ${liveCount}` : 'Сейчас матчей не идёт'}
          </p>
        </aside>
      </section>

      <nav className="date-strip" aria-label="Дни">
        {days.map((day) => {
          const key = dayKey(day)
          const count = byDay.get(key)?.length ?? 0

          return (
            <button
              key={key}
              type="button"
              className={key === selectedKey ? 'date-tab active' : 'date-tab'}
              onClick={() => setSelectedKey(key)}
            >
              {dayLabel(day, today)}
              <span className="date-count">{count}</span>
            </button>
          )
        })}
      </nav>

      <div className="columns">
        <section>
          <div className="section-head">
            <h2>Соревнования</h2>
            <Link to="/leagues" className="section-link">
              Все лиги →
            </Link>
          </div>

          {schedule.isPending && <p className="muted">Загрузка…</p>}
          {schedule.error && (
            <p className="notice">Не удалось загрузить расписание: {schedule.error.message}</p>
          )}
          {!schedule.isPending && competitions.length === 0 && (
            <p className="notice">На этот день матчей нет.</p>
          )}

          {competitions.map((competition) => (
            <CompetitionGroup key={competition.slug} competition={competition} />
          ))}
        </section>

        <StandingsPanel leagues={leagues.data ?? []} />
      </div>
    </>
  )
}
