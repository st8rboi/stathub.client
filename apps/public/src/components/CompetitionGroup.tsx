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
            {competition.matches.length === 1 ? 'матч' : 'матчей'}
          </span>
        </span>

        <span className={expanded ? 'competition-chevron open' : 'competition-chevron'}>⌄</span>
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
