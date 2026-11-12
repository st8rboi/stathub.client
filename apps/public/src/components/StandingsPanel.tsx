import { useState } from 'react'
import { Link } from 'react-router'
import { StandingsTable } from '@/components/StandingsTable'
import type { PublicLeague } from '@/api/types'
import { useLeague, useStage } from '@/hooks'

/**
 * Правый сайдбар: таблица лиги. Выбор лиги — из опубликованного каталога, турнир берём последний
 * (текущий сезон). Если в турнире несколько дивизионов, появляется их переключатель;
 * этап — первый в дивизионе.
 */
export function StandingsPanel({ leagues }: { leagues: PublicLeague[] }) {
  const [slug, setSlug] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const activeSlug = slug || leagues[0]?.slug || ''

  const leaguePage = useLeague(activeSlug)
  const tournament = leaguePage.data?.tournaments.at(-1)
  const divisions = tournament?.divisions ?? []
  // Выбранного дивизиона может не быть в другой лиге — тогда берём первый.
  const division = divisions.find((item) => item.id === divisionId) ?? divisions[0]
  const stageId = division?.stages[0]?.id ?? ''
  const stage = useStage(stageId)

  const stageName = stage.data?.stage.name ?? tournament?.name ?? ''
  const isEmpty = (stage.data?.standings.length ?? 0) === 0 && (stage.data?.standingsGroups.length ?? 0) === 0

  return (
    <div className="side-panel">
      <div className="side-panel-head">
        <select value={activeSlug} onChange={(event) => setSlug(event.target.value)} aria-label="Лига">
          {leagues.length === 0 && <option value="">Нет лиг</option>}
          {leagues.map((league) => (
            <option key={league.id} value={league.slug}>
              {league.name}
            </option>
          ))}
        </select>
        {stageId && (
          <Link to={`/stages/${stageId}`} className="side-panel-link">
            Таблица →
          </Link>
        )}
      </div>

      {divisions.length > 1 && (
        <div className="side-panel-head" style={{ marginTop: 8 }}>
          <select
            value={division?.id ?? ''}
            onChange={(event) => setDivisionId(event.target.value)}
            aria-label="Дивизион"
          >
            {divisions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="side-panel-subtitle">{stageName}</p>

      {isEmpty ? (
        <p className="muted side-panel-empty">Таблица появится после первых сыгранных матчей.</p>
      ) : (
        <StandingsTable rows={stage.data?.standings ?? []} groups={stage.data?.standingsGroups} compact />
      )}
    </div>
  )
}
