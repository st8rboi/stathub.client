import type { StandingsRow } from '@/api/types'

/**
 * Турнирная таблица этапа. Приходит готовой с сервера: она считается на каждый GET
 * из протокола матчей и нигде не кэшируется (documentation/doc.md §9.2).
 */
export function StandingsTable({ rows }: { rows: StandingsRow[] }) {
  if (rows.length === 0) {
    return <p className="notice" style={{ margin: 16 }}>Таблица появится, когда на этапе будут сыгранные матчи.</p>
  }

  return (
    <table className="standings-table">
      <thead>
        <tr>
          <th className="col-index">#</th>
          <th>Команда</th>
          <th className="num">И</th>
          <th className="num">В</th>
          <th className="num">Н</th>
          <th className="num">П</th>
          <th className="num">Голы</th>
          <th className="num">±</th>
          <th className="num">О</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.teamId}>
            <td className="muted col-index">{index + 1}</td>
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
            <td className="num">{row.wins}</td>
            <td className="num">{row.draws}</td>
            <td className="num">{row.losses}</td>
            <td className="num">
              {row.goalsFor}:{row.goalsAgainst}
            </td>
            <td className="num">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
            <td className="num">
              <strong>{row.points}</strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
