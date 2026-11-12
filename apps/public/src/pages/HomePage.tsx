import { useQueryClient } from '@tanstack/react-query'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { PublicMatch, PublicMatchDay } from '@/api/types'
import { CompetitionGroup, matchesWord, type Competition } from '@/components/CompetitionGroup'
import { Skeleton } from '@/components/Skeleton'
import { StandingsPanel } from '@/components/StandingsPanel'
import { useLeagues, useMatchDays, useSchedule } from '@/hooks'
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

function dayKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

/** «YYYY-MM-DD» → локальная полночь этого дня. */
function parseDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Начало следующих суток; через конструктор, а не +24 ч — иначе ломается на переходе на летнее время. */
function nextDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
}

function dayLabel(key: string, todayKey: string): string {
  const date = parseDayKey(key)
  const today = parseDayKey(todayKey)
  const diff = Math.round((date.getTime() - today.getTime()) / DAY_MS)

  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Завтра'
  if (diff === -1) return 'Вчера'

  const label = date.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: date.getFullYear() === today.getFullYear() ? undefined : '2-digit',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Сегодня, если сегодня есть матчи; иначе ближайший будущий день; если будущих нет — последний прошедший. */
function nearestDay(days: PublicMatchDay[], todayKey: string): string | null {
  if (days.length === 0) return null
  // Ключи «YYYY-MM-DD» сравниваются как строки в хронологическом порядке.
  return (days.find((day) => day.date >= todayKey) ?? days[days.length - 1]).date
}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export default function HomePage() {
  const queryClient = useQueryClient()

  const [timeZone] = useState(browserTimeZone)
  const [todayKey] = useState(() => dayKey(new Date()))
  const [pickedKey, setPickedKey] = useState<string | null>(null)
  const [filter, setFilter] = useState<MatchFilter>('all')

  // Полоса дат — только дни, в которые есть матчи: у любительских лиг игровых дней 1–2 в неделю,
  // и пустые вкладки только мешали бы листать.
  const matchDays = useMatchDays(timeZone)
  const days = useMemo(() => matchDays.data ?? [], [matchDays.data])

  // Пока пользователь ничего не выбрал (или выбранный день исчез после обновления) —
  // ближайший к сегодняшнему день с матчами.
  const selectedKey =
    pickedKey && days.some((day) => day.date === pickedKey) ? pickedKey : nearestDay(days, todayKey)

  const selectedRange = useMemo(() => {
    const from = parseDayKey(selectedKey ?? todayKey)
    return { from, to: nextDay(from) }
  }, [selectedKey, todayKey])

  const schedule = useSchedule(selectedRange.from, selectedRange.to, selectedKey !== null)
  const leagues = useLeagues('', '')

  // Матчи без лиги (битые/тестовые данные) отбрасываем до группировки, иначе пустая группа.
  const dayMatches = useMemo(
    () => (schedule.data ?? []).filter((match) => match.leagueSlug !== ''),
    [schedule.data],
  )

  const cityBySlug = useMemo(
    () => new Map((leagues.data ?? []).map((league) => [league.slug, league.city])),
    [leagues.data],
  )

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
        {days.length > 0 && (
          <DayStrip days={days} selectedKey={selectedKey} todayKey={todayKey} onSelect={setPickedKey} />
        )}

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

        {matchDays.isPending && <Skeleton />}
        {matchDays.error && (
          <p className="feed-empty">Не удалось загрузить расписание: {matchDays.error.message}</p>
        )}
        {matchDays.isSuccess && days.length === 0 && <p className="feed-empty">Матчей пока нет.</p>}

        {selectedKey && (
          <>
            {schedule.isPending && <Skeleton />}
            {schedule.error && (
              <p className="feed-empty">Не удалось загрузить расписание: {schedule.error.message}</p>
            )}
            {schedule.isSuccess && competitions.length === 0 && (
              <p className="feed-empty">{EMPTY_TEXT[filter]}</p>
            )}
          </>
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

type DayStripProps = {
  days: PublicMatchDay[]
  selectedKey: string | null
  todayKey: string
  onSelect: (key: string) => void
}

/**
 * Полоса дней с матчами: листается в обе стороны свайпом/колёсиком или стрелками,
 * выбранный день держится по центру.
 */
function DayStrip({ days, selectedKey, todayKey, onSelect }: DayStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })
  // Первое центрирование — мгновенно (страница открывается сразу на нужном дне), дальше — плавно.
  const centeredOnce = useRef(false)

  const updateEdges = () => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const start = scroller.scrollLeft <= 1
    const end = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1
    setEdges((previous) => (previous.start === start && previous.end === end ? previous : { start, end }))
  }

  // Центрируем выбранный день. Считаем scrollLeft сами, а не через scrollIntoView,
  // чтобы не дёргать вертикальную прокрутку страницы.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const active = scroller?.querySelector<HTMLElement>('.day-tab.active')

    if (scroller && active) {
      const offset = active.getBoundingClientRect().left - scroller.getBoundingClientRect().left
      scroller.scrollTo({
        left: scroller.scrollLeft + offset - (scroller.clientWidth - active.offsetWidth) / 2,
        behavior: centeredOnce.current ? 'smooth' : 'auto',
      })
      centeredOnce.current = true
    }

    updateEdges()
  }, [selectedKey, days])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const observer = new ResizeObserver(updateEdges)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  const page = (direction: 1 | -1) => {
    const scroller = scrollerRef.current
    if (!scroller) return

    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <nav className="day-strip" aria-label="Дни с матчами">
      <button
        type="button"
        className="day-strip-arrow"
        aria-label="Раньше"
        disabled={edges.start}
        onClick={() => page(-1)}
      >
        ‹
      </button>

      <div ref={scrollerRef} className="day-strip-scroller" onScroll={updateEdges}>
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            className={day.date === selectedKey ? 'day-tab active' : 'day-tab'}
            aria-current={day.date === selectedKey ? 'date' : undefined}
            onClick={() => onSelect(day.date)}
          >
            {dayLabel(day.date, todayKey)}
            <span className="day-tab-count">
              {day.count} {matchesWord(day.count)}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="day-strip-arrow"
        aria-label="Позже"
        disabled={edges.end}
        onClick={() => page(1)}
      >
        ›
      </button>
    </nav>
  )
}
