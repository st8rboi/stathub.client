import { useState } from 'react'
import { Link } from 'react-router'
import type { PublicLeague } from '@/api/types'
import { useLeague, useStage } from '@/hooks'

/**
 * Правый сайдбар: таблица лиги. Выбор лиги — из опубликованного каталога,
 * этап берём первый у последнего турнира лиги (текущий сезон).
 */
export function StandingsPanel({ leagues }: { leagues: PublicLeague[] }) {
  const [slug, setSlug] = useState('')
  const activeSlug = slug || leagues[0]?.slug || ''

  const leaguePage = useLeague(activeSlug)
  const tournament = leaguePage.data?.tournaments.at(-1)
  const stageId = tournament?.stages[0]?.id ?? ''
  const stage = useStage(stageId)

  const rows = stage.data?.standings ?? []
  const stageName = stage.data?.stage.name ?? tournament?.name ?? ''

  return (
    <aside className="side-panel">
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

      <p className="side-panel-subtitle">{stageName}</p>

      {rows.length === 0 ? (
        <p className="muted side-panel-empty">Таблица появится после первых сыгранных матчей.</p>
      ) : (
        <table className="standings-table">
          <thead>
            <tr>
              <th>Команда</th>
              <th className="num">И</th>
              <th className="num">±</th>
              <th className="num">О</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.teamId}>
                <td>
                  <div className="standings-team">
                    {row.teamLogoUrl ? (
                      <img src={row.teamLogoUrl} alt="" className="team-logo team-logo--sm" />
                    ) : (
                      <span className="team-logo team-logo--sm team-logo--empty" />
                    )}
                    <span>{row.teamName || '—'}</span>
                  </div>
                </td>
                <td className="num">{row.played}</td>
                <td className="num">
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </td>
                <td className="num">
                  <strong>{row.points}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </aside>
  )
}
