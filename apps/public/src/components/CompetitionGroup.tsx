import { useState } from 'react'
import { Link } from 'react-router'
import type { PublicMatch } from '@/api/types'
import { FixtureRow } from '@/components/FixtureRow'

export type Competition = {
  key: string
  slug: string
  /** Дивизион, если их в турнире несколько. */
  division: string | null
  name: string
  logoUrl: string | null
  city: string | null
  matches: PublicMatch[]
}

export function matchesWord(count: number): string {
  const lastTwo = count % 100
  const last = count % 10

  if (lastTwo >= 11 && lastTwo <= 14) return 'матчей'
  if (last === 1) return 'матч'
  if (last >= 2 && last <= 4) return 'матча'
  return 'матчей'
}

/**
 * Группа матчей одной лиги внутри общей ленты: плоская строка-заголовок
 * (логотип, название, город) и список матчей, который можно свернуть.
 */
export function CompetitionGroup({ competition }: { competition: Competition }) {
  const [expanded, setExpanded] = useState(true)
  const count = competition.matches.length

  return (
    <section className="feed-group">
      <div className="feed-group-head">
        {competition.logoUrl ? (
          <img src={competition.logoUrl} alt="" className="team-logo" />
        ) : (
          <span className="team-logo team-logo--empty" />
        )}

        <Link to={`/leagues/${competition.slug}`} className="feed-group-name">
          {competition.name}
        </Link>

        {competition.division && <span className="feed-group-division">{competition.division}</span>}

        <span className="feed-group-meta">
          {competition.city ? `${competition.city} · ` : ''}
          {count} {matchesWord(count)}
        </span>

        <button
          type="button"
          className="feed-group-toggle"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Свернуть' : 'Развернуть'}
        >
          <span className={expanded ? 'competition-chevron open' : 'competition-chevron'} aria-hidden="true" />
        </button>
      </div>

      {expanded && competition.matches.map((match) => <FixtureRow key={match.id} match={match} />)}
    </section>
  )
}
