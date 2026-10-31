import { useState } from 'react'
import type { PublicMatch } from '@/api/types'
import { FixtureRow } from '@/components/FixtureRow'

export type Competition = {
  slug: string
  name: string
  logoUrl: string | null
  city: string | null
  matches: PublicMatch[]
}

function matchesWord(count: number): string {
  const lastTwo = count % 100
  const last = count % 10

  if (lastTwo >= 11 && lastTwo <= 14) return 'матчей'
  if (last === 1) return 'матч'
  if (last >= 2 && last <= 4) return 'матча'
  return 'матчей'
}

/** Карточка соревнования: шапка с гербом и раскрывающийся список матчей (как в референсе). */
export function CompetitionGroup({ competition }: { competition: Competition }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <section className="competition">
      <button
        type="button"
        className="competition-head"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {competition.logoUrl ? (
          <img src={competition.logoUrl} alt="" className="competition-logo" />
        ) : (
          <span className="competition-logo competition-logo--empty" />
        )}

        <span className="competition-title">
          <span className="competition-name">{competition.name}</span>
          <span className="competition-meta">
            {competition.city ?? 'География не указана'} · {competition.matches.length}{' '}
            {matchesWord(competition.matches.length)}
          </span>
        </span>

        <span className={expanded ? 'competition-chevron open' : 'competition-chevron'} aria-hidden="true" />
      </button>

      {expanded && (
        <div className="competition-body">
          {competition.matches.map((match) => (
            <FixtureRow key={match.id} match={match} />
          ))}
        </div>
      )}
    </section>
  )
}
