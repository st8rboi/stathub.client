import { Link } from 'react-router'
import type { StandingsGroup, StandingsRow } from '@/api/types'
import { TeamLink } from '@/components/TeamLink'

type Props = {
  rows: StandingsRow[]
  /** Таблицы групп: если этап групповой, показываем их вместо общей таблицы. */
  groups?: StandingsGroup[]
  highlightTeamId?: string
  /** Несколько выделенных команд — например, обе команды матча на его странице. */
  highlightTeamIds?: string[]
  /** Узкий вариант для боковой панели: без побед, ничьих, поражений и голов. */
  compact?: boolean
}

/** Зона выхода — зелёная, вылета — красная; в боковой панели без зон по-прежнему выделяем первую тройку. */
function positionClass(row: StandingsRow, index: number, highlightTop: boolean): string {
  if (row.qualifies) return 'col-index standings-pos standings-pos--qualifies'
  if (row.eliminated) return 'col-index standings-pos standings-pos--eliminated'
  if (highlightTop) return index < 3 ? 'col-index standings-pos standings-pos--top' : 'col-index standings-pos'
  return 'muted col-index'
}

const liveOutcomeLabels = { Win: 'выигрывает', Draw: 'ничья', Loss: 'проигрывает' } as const

/** Строка играющей сейчас команды подсвечена по текущему исходу; своя команда — отдельным классом. */
function rowClass(row: StandingsRow, highlighted: string[]): string | undefined {
  const classes = [
    highlighted.includes(row.teamId) && 'standings-row--current',
    row.live && `standings-row--live standings-row--${row.live.outcome.toLowerCase()}`,
  ].filter(Boolean)
  return classes.length > 0 ? classes.join(' ') : undefined
}

/** Текущий счёт идущего матча команды (её голы первыми) со ссылкой на матч. */
function LiveScore({ row }: { row: StandingsRow }) {
  if (!row.live) return null

  const { matchId, goalsFor, goalsAgainst, outcome } = row.live
  const label = `Идёт матч: ${goalsFor}:${goalsAgainst}, ${liveOutcomeLabels[outcome]}`
  const content = `${goalsFor}:${goalsAgainst}`
  const className = `standings-live-score standings-live-score--${outcome.toLowerCase()}`

  return matchId ? (
    <Link to={`/matches/${matchId}`} className={className} title={label} aria-label={label}>
      {content}
    </Link>
  ) : (
    <span className={className} title={label} aria-label={label}>
      {content}
    </span>
  )
}

/**
 * Турнирная таблица этапа: общая или по группам. Приходит готовой с сервера: она считается
 * на каждый GET из протокола матчей и нигде не кэшируется (documentation/doc.md §9.2).
 * Места в зоне выхода в следующий этап отмечены зелёным, в зоне вылета — красным.
 * Live: идущие матчи уже учтены с текущим счётом, строки играющих команд подсвечены по исходу
 * (выигрывает — зелёный, ничья — жёлтый, проигрывает — красный).
 */
export function StandingsTable({ rows, groups = [], highlightTeamId, highlightTeamIds = [], compact = false }: Props) {
  const highlighted = highlightTeamId ? [highlightTeamId, ...highlightTeamIds] : highlightTeamIds

  if (rows.length === 0 && groups.length === 0) {
    return <p className="notice" style={{ margin: 16 }}>Таблица появится, когда на этапе будут сыгранные матчи.</p>
  }

  const tables = groups.length > 0 ? groups : [{ groupId: '', name: '', rows }]
  const hasQualifiers = tables.some((table) => table.rows.some((row) => row.qualifies))
  const hasEliminated = tables.some((table) => table.rows.some((row) => row.eliminated))
  const hasZone = hasQualifiers || hasEliminated
  const hasLive = tables.some((table) => table.rows.some((row) => row.live))

  return (
    <>
      {tables.map((table) => (
        <div key={table.groupId}>
          {table.name && <h3 className="standings-group-name">{table.name}</h3>}
          {table.rows.length === 0 ? (
            <p className="muted standings-legend">В группе пока нет команд.</p>
          ) : (
            <div className="table-scroll">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th className="col-index">#</th>
                    <th className="col-team">Команда</th>
                    <th className="num">И</th>
                    {!compact && (
                      <>
                        <th className="num col-extra">В</th>
                        <th className="num col-extra">Н</th>
                        <th className="num col-extra">П</th>
                        <th className="num col-extra">Голы</th>
                      </>
                    )}
                    <th className="num">±</th>
                    <th className="num">О</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr key={row.teamId} className={rowClass(row, highlighted)}>
                      <td className={positionClass(row, index, compact && !hasZone)}>
                        {row.position ?? index + 1}
                      </td>
                      <td className="col-team">
                        <div className="standings-team-cell">
                          <TeamLink teamId={row.teamId} name={row.teamName} logoUrl={row.teamLogoUrl} />
                          <LiveScore row={row} />
                        </div>
                      </td>
                      <td className="num">{row.played}</td>
                      {!compact && (
                        <>
                          <td className="num col-extra">{row.wins}</td>
                          <td className="num col-extra">{row.draws}</td>
                          <td className="num col-extra">{row.losses}</td>
                          <td className="num col-extra">
                            {row.goalsFor}:{row.goalsAgainst}
                          </td>
                        </>
                      )}
                      <td className="num">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                      <td className="num">
                        <strong>{row.points}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
      {(hasZone || hasLive) && (
        <ul className="standings-legend">
          {hasLive && (
            <li>
              <span className="standings-legend-live" aria-hidden="true" />
              Live: идущие матчи учтены с текущим счётом
            </li>
          )}
          {hasQualifiers && (
            <li>
              <span className="standings-legend-mark standings-legend-mark--qualifies" aria-hidden="true" />
              Выход в следующий этап
            </li>
          )}
          {hasEliminated && (
            <li>
              <span className="standings-legend-mark standings-legend-mark--eliminated" aria-hidden="true" />
              Вылет
            </li>
          )}
        </ul>
      )}
    </>
  )
}
