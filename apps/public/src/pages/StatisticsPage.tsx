import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { PlayerStatisticsRow } from '@/api/types'
import { useLeague, useLeagues, useTournamentStatistics } from '@/hooks'

type SectionId = 'goals' | 'assists' | 'points' | 'yellow' | 'red'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'goals', label: 'Бомбардиры' },
  { id: 'assists', label: 'Ассистенты' },
  { id: 'points', label: 'Гол+пас' },
  { id: 'yellow', label: 'ЖК' },
  { id: 'red', label: 'КК' },
]

/** Колонка-метрика конкретного раздела: подпись и как её достать из строки. */
type MetricColumn = { label: string; value: (row: PlayerStatisticsRow) => number }

function columnsFor(section: SectionId): MetricColumn[] {
  switch (section) {
    case 'goals':
      return [
        { label: 'М', value: (row) => row.matches },
        { label: 'Г', value: (row) => row.goals },
      ]
    case 'assists':
      return [
        { label: 'М', value: (row) => row.matches },
        { label: 'А', value: (row) => row.assists },
      ]
    case 'points':
      return [
        { label: 'Г', value: (row) => row.goals },
        { label: 'А', value: (row) => row.assists },
        { label: 'Г+П', value: (row) => row.goals + row.assists },
      ]
    case 'yellow':
      return [
        { label: 'М', value: (row) => row.matches },
        { label: 'ЖК', value: (row) => row.yellowCards },
      ]
    case 'red':
      return [
        { label: 'М', value: (row) => row.matches },
        { label: 'КК', value: (row) => row.redCards },
      ]
  }
}

/** Основная метрика раздела — по ней фильтруем нули и сортируем таблицу. */
function mainMetric(section: SectionId, row: PlayerStatisticsRow): number {
  switch (section) {
    case 'goals':
      return row.goals
    case 'assists':
      return row.assists
    case 'points':
      return row.goals + row.assists
    case 'yellow':
      return row.yellowCards
    case 'red':
      return row.redCards
  }
}

/**
 * Статистика игроков. Всегда в разрезе одного турнира: сводки «по лиге» или «по этапу»
 * смешивали бы разные соревнования и правила. Разделы — отдельные «топы» с разной сортировкой.
 */
export default function StatisticsPage() {
  const [params, setParams] = useSearchParams()
  const leagues = useLeagues('', '')

  const [slug, setSlug] = useState('')
  const [section, setSection] = useState<SectionId>('goals')

  // Лигу можно прийти по ссылке из турнира (?league=...&tournament=...).
  const leagueFromUrl = params.get('league') ?? ''
  const activeSlug = slug || leagueFromUrl || leagues.data?.[0]?.slug || ''

  const leaguePage = useLeague(activeSlug)
  const tournaments = leaguePage.data?.tournaments ?? []

  // По умолчанию — последний турнир лиги (текущий сезон).
  const tournamentId = params.get('tournament') ?? tournaments.at(-1)?.id ?? ''
  const statistics = useTournamentStatistics(tournamentId)

  const rows = statistics.data?.rows ?? []

  const sectionRows = useMemo(() => {
    return rows
      .filter((row) => mainMetric(section, row) > 0)
      .sort((left, right) => {
        const byMetric = mainMetric(section, right) - mainMetric(section, left)
        return byMetric !== 0 ? byMetric : left.playerName.localeCompare(right.playerName, 'ru')
      })
  }, [rows, section])

  const columns = columnsFor(section)

  const onLeagueChange = (value: string) => {
    setSlug(value)
    setParams({ league: value })
  }

  const onTournamentChange = (value: string) => {
    setParams({ league: activeSlug, tournament: value })
  }

  return (
    <>
      <h1>Статистика игроков</h1>

      <div className="filters">
        <label>
          Лига
          <select value={activeSlug} onChange={(event) => onLeagueChange(event.target.value)}>
            {leagues.data?.length === 0 && <option value="">Нет лиг</option>}
            {(leagues.data ?? []).map((league) => (
              <option key={league.id} value={league.slug}>
                {league.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Турнир
          <select
            value={tournamentId}
            onChange={(event) => onTournamentChange(event.target.value)}
            disabled={tournaments.length === 0}
          >
            {tournaments.length === 0 && <option value="">Нет турниров</option>}
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {statistics.error && (
        <p className="notice">Не удалось загрузить статистику: {statistics.error.message}</p>
      )}

      {statistics.data && (
        <p className="crumb">
          <Link to={`/leagues/${statistics.data.tournament.leagueSlug}`}>
            ← {statistics.data.tournament.leagueName}
          </Link>{' '}
          · {statistics.data.tournament.name}
        </p>
      )}

      {tournamentId === '' ? (
        <p className="notice">Выберите турнир — статистика считается отдельно по каждому.</p>
      ) : (
        <>
          <nav className="date-strip" aria-label="Разделы статистики">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === section ? 'date-tab active' : 'date-tab'}
                onClick={() => setSection(item.id)}
              >
                {item.label}
                <span className="date-count">
                  {rows.filter((row) => mainMetric(item.id, row) > 0).length}
                </span>
              </button>
            ))}
          </nav>

          {!statistics.isPending && sectionRows.length === 0 && (
            <p className="notice">В этом разделе пока нет данных: всё появится после матчей.</p>
          )}

          {sectionRows.length > 0 && (
            <div className="competition competition--plain">
              <div className="table-scroll">
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th className="col-index">#</th>
                      <th>Игрок</th>
                      <th>Команда</th>
                      {columns.map((column) => (
                        <th key={column.label} className="num">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRows.map((row, index) => (
                      <tr key={row.playerId}>
                        <td className="muted col-index">{index + 1}</td>
                        <td className="stats-name">{row.playerName}</td>
                        <td>
                          <div className="standings-team">
                            {row.teamLogoUrl ? (
                              <img src={row.teamLogoUrl} alt="" className="team-logo team-logo--sm" />
                            ) : (
                              <span className="team-logo team-logo--sm team-logo--empty" />
                            )}
                            <span>{row.teamName ?? '—'}</span>
                          </div>
                        </td>
                        {columns.map((column, columnIndex) => (
                          <td key={column.label} className="num">
                            {columnIndex === columns.length - 1 ? (
                              <strong>{column.value(row)}</strong>
                            ) : (
                              column.value(row)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <p className="muted" style={{ marginTop: 16 }}>
        М — матчи турнира, в которых у игрока было событие; Г — голы, А — ассисты, Г+П — голы плюс
        передачи, ЖК/КК — карточки. Отменённые события и голы без указанного автора не учитываются.
      </p>
    </>
  )
}
