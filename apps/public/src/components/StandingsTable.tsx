import type { StandingsGroup, StandingsRow } from '@/api/types'
import { TeamLink } from '@/components/TeamLink'

type Props = {
  rows: StandingsRow[]
  /** Таблицы групп: если этап групповой, показываем их вместо общей таблицы. */
  groups?: StandingsGroup[]
  highlightTeamId?: string
  /** Узкий вариант для боковой панели: без побед, ничьих, поражений и голов. */
  compact?: boolean
}

/** Зона выхода — зелёная; в боковой панели без зоны по-прежнему выделяем первую тройку. */
function positionClass(row: StandingsRow, index: number, highlightTop: boolean): string {
  if (row.qualifies) return 'col-index standings-pos standings-pos--qualifies'
  if (highlightTop) return index < 3 ? 'col-index standings-pos standings-pos--top' : 'col-index standings-pos'
  return 'muted col-index'
}

/**
 * Турнирная таблица этапа: общая или по группам. Приходит готовой с сервера: она считается
 * на каждый GET из протокола матчей и нигде не кэшируется (documentation/doc.md §9.2).
 * Места в зоне выхода в следующий этап отмечены зелёным.
 */
export function StandingsTable({ rows, groups = [], highlightTeamId, compact = false }: Props) {
  if (rows.length === 0 && groups.length === 0) {
    return <p className="notice" style={{ margin: 16 }}>Таблица появится, когда на этапе будут сыгранные матчи.</p>
  }

  const tables = groups.length > 0 ? groups : [{ groupId: '', name: '', rows }]
  const hasZone = tables.some((table) => table.rows.some((row) => row.qualifies))

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
                    <tr
                      key={row.teamId}
                      className={row.teamId === highlightTeamId ? 'standings-row--current' : undefined}
                    >
                      <td className={positionClass(row, index, compact && !hasZone)}>
                        {row.position ?? index + 1}
                      </td>
                      <td className="col-team">
                        <TeamLink teamId={row.teamId} name={row.teamName} logoUrl={row.teamLogoUrl} />
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
      {hasZone && <p className="standings-legend">Зелёным отмечены места, с которых команды выходят в следующий этап.</p>}
    </>
  )
}
