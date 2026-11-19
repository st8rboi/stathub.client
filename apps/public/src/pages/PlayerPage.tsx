import { Link, useParams } from 'react-router'
import type { PublicPlayerCareerRow } from '@/api/types'
import { Skeleton } from '@/components/Skeleton'
import { teamPath } from '@/components/TeamLink'
import { usePlayer } from '@/hooks'
import { ageOf, formatDate, registrationLeftLabels } from '@/labels'

type Totals = Pick<
  PublicPlayerCareerRow,
  'matches' | 'goals' | 'assists' | 'ownGoals' | 'yellowCards' | 'redCards'
>

function sum(rows: PublicPlayerCareerRow[]): Totals {
  return rows.reduce<Totals>(
    (total, row) => ({
      matches: total.matches + row.matches,
      goals: total.goals + row.goals,
      assists: total.assists + row.assists,
      ownGoals: total.ownGoals + row.ownGoals,
      yellowCards: total.yellowCards + row.yellowCards,
      redCards: total.redCards + row.redCards,
    }),
    { matches: 0, goals: 0, assists: 0, ownGoals: 0, yellowCards: 0, redCards: 0 },
  )
}

/** Ссылка на команду сразу на тот этап, где игрок за неё выступал. */
const teamStagePath = (row: PublicPlayerCareerRow) => `${teamPath(row.teamId)}?stage=${row.stageId}`

function statusText(row: PublicPlayerCareerRow): string {
  if (row.status === 'Active') return `В заявке с ${formatDate(row.joinedOn)}`
  const left = registrationLeftLabels[row.status] ?? 'Ушёл'
  return row.leftOn ? `${left} ${formatDate(row.leftOn)}` : left
}

function CareerTable({ rows }: { rows: PublicPlayerCareerRow[] }) {
  const totals = sum(rows)

  return (
    <div className="table-scroll">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="col-team">Команда и турнир</th>
            <th className="num" title="Матчи с событиями игрока">М</th>
            <th className="num" title="Голы">Г</th>
            <th className="num" title="Передачи">А</th>
            <th className="num col-extra" title="Автоголы">АГ</th>
            <th className="num" title="Жёлтые карточки">ЖК</th>
            <th className="num" title="Красные карточки">КК</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.divisionId}:${row.teamId}`}>
              <td className="col-team">
                <div className="roster-player">
                  {row.teamLogoUrl ? (
                    <img src={row.teamLogoUrl} alt="" className="team-logo team-logo--sm" />
                  ) : (
                    <span className="team-logo team-logo--sm team-logo--empty" />
                  )}
                  <span className="roster-text">
                    <Link to={teamStagePath(row)} className="roster-name team-link">
                      {row.teamName}
                    </Link>
                    <span className="roster-meta">
                      <Link to={`/leagues/${row.leagueSlug}`} className="career-league">
                        {row.leagueName}
                      </Link>
                      {' · '}
                      {[row.tournamentName, row.divisionName].filter(Boolean).join(' · ')}
                    </span>
                    <span className="roster-meta">{statusText(row)}</span>
                  </span>
                </div>
              </td>
              <td className="num">{row.matches}</td>
              <td className="num">
                <strong>{row.goals}</strong>
              </td>
              <td className="num">{row.assists}</td>
              <td className="num col-extra">{row.ownGoals}</td>
              <td className="num">{row.yellowCards}</td>
              <td className="num">{row.redCards}</td>
            </tr>
          ))}
        </tbody>
        {rows.length > 1 && (
          <tfoot>
            <tr className="career-total">
              <td className="col-team">Всего</td>
              <td className="num">{totals.matches}</td>
              <td className="num">
                <strong>{totals.goals}</strong>
              </td>
              <td className="num">{totals.assists}</td>
              <td className="num col-extra">{totals.ownGoals}</td>
              <td className="num">{totals.yellowCards}</td>
              <td className="num">{totals.redCards}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export default function PlayerPage() {
  const { playerId = '' } = useParams()
  const page = usePlayer(playerId)

  if (page.error) return <p className="notice">Не удалось загрузить игрока: {page.error.message}</p>
  if (!page.data) return <Skeleton rows={5} />

  const { player, career } = page.data
  const age = ageOf(player.birthDate)
  // Текущая команда — самая свежая активная заявка; без неё — последняя команда игрока.
  const current = career.find((row) => row.status === 'Active') ?? career[0]
  const totals = sum(career)

  return (
    <>
      {current && (
        <p className="crumb">
          <Link to={teamStagePath(current)}>← {current.teamName}</Link>
        </p>
      )}

      <div className="league-header team-header">
        {player.photoUrl ? (
          <img src={player.photoUrl} alt="" className="league-hero-logo player-hero-photo" />
        ) : (
          <span className="league-hero-logo player-hero-photo roster-photo--empty" aria-hidden="true">
            {player.fullName.charAt(0)}
          </span>
        )}

        <div>
          <h1>{player.fullName}</h1>
          <p className="muted">
            {[age !== null ? `${age} лет` : null, current?.teamName].filter(Boolean).join(' · ')}
            {current && current.status !== 'Active' && <span className="team-badge">Без активной заявки</span>}
          </p>
        </div>
      </div>

      <div className="team-summary">
        <div className="team-stat">
          <span className="team-stat-value">{totals.matches}</span>
          <span className="team-stat-label">Матчи</span>
        </div>
        <div className="team-stat">
          <span className="team-stat-value">{totals.goals}</span>
          <span className="team-stat-label">Голы</span>
        </div>
        <div className="team-stat">
          <span className="team-stat-value">{totals.assists}</span>
          <span className="team-stat-label">Передачи</span>
        </div>
        <div className="team-stat">
          <span className="team-stat-value">
            {totals.yellowCards}
            <small> / {totals.redCards}</small>
          </span>
          <span className="team-stat-label">ЖК / КК</span>
        </div>
      </div>

      <div className="section-head">
        <h2>Выступления</h2>
        <span className="muted">{career.length}</span>
      </div>
      <div className="competition competition--plain team-block">
        <CareerTable rows={career} />
      </div>

      <p className="footnote">
        Только турниры опубликованных лиг. Статистика — за матчи команды во всех этапах дивизиона. М —
        матчи, в которых у игрока было событие; Г — голы, А — передачи, АГ — автоголы, ЖК/КК — карточки.
      </p>
    </>
  )
}
