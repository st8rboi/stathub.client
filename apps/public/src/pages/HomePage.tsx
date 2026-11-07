import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { PublicMatch } from '@/api/types'
import { CompetitionGroup, matchesWord, type Competition } from '@/components/CompetitionGroup'
import { Skeleton } from '@/components/Skeleton'
import { StandingsPanel } from '@/components/StandingsPanel'
import { useLeagues, useSchedule } from '@/hooks'
import { isLiveMatch } from '@/labels'
import { useRealtime } from '@/realtime'

const DAY_MS = 86_400_000
const LEAGUES_IN_SIDEBAR = 12

type MatchFilter = 'all' | 'live' | 'finished' | 'scheduled'

const FILTERS: { id: MatchFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'live', label: 'LIVE' },
  { id: 'finished', label: 'Завершённые' },
  { id: 'scheduled', label: 'Расписание' },
]

const EMPTY_TEXT: Record<MatchFilter, string> = {
  all: 'На этот день матчей нет.',
  live: 'Сейчас нет идущих матчей.',
  finished: 'Завершённых матчей пока нет.',
  scheduled: 'Предстоящих матчей нет.',
}

function matchesFilter(match: PublicMatch, filter: MatchFilter): boolean {
  switch (filter) {
    case 'live':
      return isLiveMatch(match.status)
    case 'finished':
      return match.status === 'Finished'
    case 'scheduled':
      return match.status === 'Scheduled'
    default:
      return true
  }
}

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

  const label = date.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function HomePage() {
  const queryClient = useQueryClient()

  const [today] = useState(() => startOfDay(new Date()))
  const [selectedKey, setSelectedKey] = useState(() => dayKey(startOfDay(new Date())))
  const [filter, setFilter] = useState<MatchFilter>('all')

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => new Date(today.getTime() + index * DAY_MS)),
    [today],
  )

  const schedule = useSchedule(today, new Date(today.getTime() + 7 * DAY_MS))
  const leagues = useLeagues('', '')

  // Счётчики в полосе дат и список соревнований строятся из одного и того же набора:
  // матчи без лиги (битые/тестовые данные) отбрасываем до группировки, иначе
  // «Сегодня 1» при пустом списке.
  const matches = useMemo(
    () => (schedule.data ?? []).filter((match) => match.leagueSlug !== ''),
    [schedule.data],
  )

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

  const dayMatches = useMemo(() => byDay.get(selectedKey) ?? [], [byDay, selectedKey])
  const liveCount = dayMatches.filter((match) => isLiveMatch(match.status)).length
  const visibleMatches = useMemo(
    () => dayMatches.filter((match) => matchesFilter(match, filter)),
    [dayMatches, filter],
  )

  const competitions = useMemo<Competition[]>(() => {
    const map = new Map<string, Competition>()

    for (const match of visibleMatches) {
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
  }, [visibleMatches, cityBySlug])

  // Push — сигнал «перечитай расписание»; сам список всегда из REST (doc §4).
  useRealtime({}, () => {
    void queryClient.invalidateQueries({ queryKey: ['public'] })
  })

  return (
    <div className="home">
      <h1 className="visually-hidden">Матчи любительского футбола: онлайн-счёт и расписание</h1>

      <aside className="home-leagues">
        <div className="home-leagues-head">
          <h2>Лиги</h2>
          <Link to="/leagues" className="section-link">
            Все →
          </Link>
        </div>

        {(leagues.data ?? []).slice(0, LEAGUES_IN_SIDEBAR).map((league) => (
          <Link key={league.id} to={`/leagues/${league.slug}`} className="home-league">
            {league.logoUrl ? (
              <img src={league.logoUrl} alt="" className="team-logo" />
            ) : (
              <span className="team-logo team-logo--empty" />
            )}
            <span className="home-league-text">
              <span className="home-league-name">{league.name}</span>
              {league.city && <span className="home-league-city">{league.city}</span>}
            </span>
          </Link>
        ))}
      </aside>

      <section className="feed" aria-label="Матчи">
        <nav className="day-strip" aria-label="Дни">
          {days.map((day) => {
            const key = dayKey(day)
            const count = byDay.get(key)?.length ?? 0

            return (
              <button
                key={key}
                type="button"
                className={key === selectedKey ? 'day-tab active' : 'day-tab'}
                onClick={() => setSelectedKey(key)}
              >
                {dayLabel(day, today)}
                <span className="day-tab-count">
                  {count} {matchesWord(count)}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="feed-filters" role="group" aria-label="Фильтр матчей">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === filter ? 'chip active' : 'chip'}
              aria-pressed={item.id === filter}
              onClick={() => setFilter(item.id)}
            >
              {item.id === 'live' && <span className="chip-dot" aria-hidden="true" />}
              {item.label}
              {item.id === 'live' && liveCount > 0 && ` ${liveCount}`}
            </button>
          ))}
        </div>

        {schedule.isPending && <Skeleton />}
        {schedule.error && (
          <p className="feed-empty">Не удалось загрузить расписание: {schedule.error.message}</p>
        )}
        {!schedule.isPending && !schedule.error && competitions.length === 0 && (
          <p className="feed-empty">{EMPTY_TEXT[filter]}</p>
        )}

        {competitions.map((competition) => (
          <CompetitionGroup key={competition.slug} competition={competition} />
        ))}
      </section>

      <aside className="home-side">
        <StandingsPanel leagues={leagues.data ?? []} />

        <div className="promo-card">
          <h2>Подписывайтесь на Статхаб</h2>
          <p>ВКонтакте, Telegram, TikTok и YouTube</p>
          <p className="promo-card-handle">@digital_stathub</p>
        </div>
      </aside>
    </div>
  )
}
