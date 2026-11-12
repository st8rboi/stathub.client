import { Link, useParams, useSearchParams } from 'react-router'
import type { PublicMatch, PublicTeamPlayer, StandingsRow } from '@/api/types'
import { FixtureRow } from '@/components/FixtureRow'
import { Skeleton } from '@/components/Skeleton'
import { StandingsTable } from '@/components/StandingsTable'
import { useTeam } from '@/hooks'
import { formatDateTime } from '@/labels'

type FormResult = 'W' | 'D' | 'L'

const formLabels: Record<FormResult, string> = { W: 'В', D: 'Н', L: 'П' }
const formTitles: Record<FormResult, string> = { W: 'Победа', D: 'Ничья', L: 'Поражение' }

function resultFor(match: PublicMatch, teamId: string): FormResult {
  const own = match.homeTeamId === teamId ? match.homeScore : match.awayScore
  const other = match.homeTeamId === teamId ? match.awayScore : match.homeScore
  return own > other ? 'W' : own < other ? 'L' : 'D'
}

function ageOf(birthDate: string | null): number | null {
  if (!birthDate) return null
  const born = new Date(birthDate)
  if (Number.isNaN(born.getTime())) return null

  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const beforeBirthday =
    now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())
  return beforeBirthday ? age - 1 : age
}

const leftLabels: Record<string, string> = {
  TransferredOut: 'Перешёл',
  Released: 'Отзаявлен',
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU')
}

function PlayerCell({ player }: { player: PublicTeamPlayer }) {
  const age = ageOf(player.birthDate)
  const left = player.status !== 'Active'

  return (
    <div className="roster-player">
      {player.photoUrl ? (
        <img src={player.photoUrl} alt="" className="roster-photo" />
      ) : (
        <span className="roster-photo roster-photo--empty" aria-hidden="true">
          {player.fullName.charAt(0)}
        </span>
      )}
      <span className="roster-text">
        <span className="roster-name">{player.fullName}</span>
        <span className="roster-meta">
          {left
            ? `${leftLabels[player.status] ?? 'Ушёл'}${player.leftOn ? ` ${formatDate(player.leftOn)}` : ''}`
            : age !== null
              ? `${age} лет`
              : ''}
        </span>
      </span>
    </div>
  )
}

function RosterTable({ players }: { players: PublicTeamPlayer[] }) {
  return (
    <div className="table-scroll">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="col-team">Игрок</th>
            <th className="num" title="Матчи с событиями игрока">М</th>
            <th className="num" title="Голы">Г</th>
            <th className="num" title="Передачи">А</th>
            <th className="num col-extra" title="Автоголы">АГ</th>
            <th className="num" title="Жёлтые карточки">ЖК</th>
            <th className="num" title="Красные карточки">КК</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.playerId}>
              <td className="col-team">
                <PlayerCell player={player} />
              </td>
              <td className="num">{player.matches}</td>
              <td className="num">
                <strong>{player.goals}</strong>
              </td>
              <td className="num">{player.assists}</td>
              <td className="num col-extra">{player.ownGoals}</td>
              <td className="num">{player.yellowCards}</td>
              <td className="num">{player.redCards}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Summary({ row, position, total }: { row: StandingsRow | undefined; position: number; total: number }) {
  if (!row) return null

  return (
    <div className="team-summary">
      <div className="team-stat">
        <span className="team-stat-value">
          {position}
          <small> / {total}</small>
        </span>
        <span className="team-stat-label">Место</span>
      </div>
      <div className="team-stat">
        <span className="team-stat-value">{row.points}</span>
        <span className="team-stat-label">Очки</span>
      </div>
      <div className="team-stat">
        <span className="team-stat-value">
          {row.wins}-{row.draws}-{row.losses}
        </span>
        <span className="team-stat-label">В-Н-П</span>
      </div>
      <div className="team-stat">
        <span className="team-stat-value">
          {row.goalsFor}:{row.goalsAgainst}
        </span>
        <span className="team-stat-label">Голы</span>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const { teamId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const stageParam = searchParams.get('stage') ?? ''
  const team = useTeam(teamId, stageParam)

  if (team.error) return <p className="notice">Не удалось загрузить команду: {team.error.message}</p>
  if (!team.data) return <Skeleton rows={6} />

  const { team: info, participations, stage, matches, standings, standingsGroups, players } = team.data

  // Идущие и запланированные — сверху; сыгранные и отменённые — в результатах, свежие первыми.
  const upcoming = matches.filter((match) => match.status !== 'Finished' && match.status !== 'Cancelled')
  const results = matches.filter((match) => !upcoming.includes(match)).reverse()
  const form = results.filter((match) => match.status === 'Finished').slice(0, 5)

  // На групповом этапе место и число соперников считаем внутри своей группы.
  const ownTable =
    standingsGroups.find((group) => group.rows.some((row) => row.teamId === info.id))?.rows ?? standings
  const ownRow = ownTable.find((row) => row.teamId === info.id)
  const participation = participations.find((item) => item.stageId === stage.id)
  // В плей-офф нет таблицы, а значит, нет места и очков.
  const playoff = stage.formatType === 'Playoff'

  // Дивизион приходит, только если их в турнире несколько. Тогда он важнее этапа, а этап
  // дописываем, когда команда играла в нескольких этапах одного дивизиона (круг и плей-офф).
  const stageLabel = (item: { stageName: string; divisionId: string; divisionName: string | null }) => {
    if (!item.divisionName) return item.stageName
    const sameDivision = participations.filter((other) => other.divisionId === item.divisionId).length
    return sameDivision > 1 ? `${item.divisionName} · ${item.stageName}` : item.divisionName
  }
  const currentLabel = participation
    ? stageLabel(participation)
    : stage.divisionsCount > 1
      ? stage.divisionName
      : stage.name

  const activePlayers = players.filter((player) => player.status === 'Active')
  const formerPlayers = players.filter((player) => player.status !== 'Active')

  const selectStage = (stageId: string) =>
    setSearchParams(
      (params) => {
        // Первый (самый свежий) этап — состояние по умолчанию, его в адрес не пишем.
        if (stageId === participations[0]?.stageId) params.delete('stage')
        else params.set('stage', stageId)
        return params
      },
      { replace: true },
    )

  return (
    <>
      <p className="crumb">
        <Link to={`/leagues/${stage.leagueSlug}`}>← {stage.leagueName}</Link> ·{' '}
        <Link to={`/stages/${stage.id}`}>{currentLabel}</Link>
      </p>

      <div className="league-header team-header">
        {info.logoUrl ? (
          <img src={info.logoUrl} alt="" className="league-hero-logo" />
        ) : (
          <span className="league-hero-logo league-card-logo--empty" />
        )}

        <div>
          <h1>{info.name}</h1>
          <p className="muted">
            {[info.city, `${stage.tournamentName} · ${currentLabel}`].filter(Boolean).join(' · ')}
            {participation?.status === 'Withdrawn' && <span className="team-badge">Снята с турнира</span>}
          </p>
        </div>
      </div>

      {participations.length > 1 && (
        <label className="team-stage-select">
          Турнир и этап
          <select value={stage.id} onChange={(event) => selectStage(event.target.value)}>
            {participations.map((item) => (
              <option key={item.stageId} value={item.stageId}>
                {item.leagueName} — {item.tournamentName} — {stageLabel(item)}
              </option>
            ))}
          </select>
        </label>
      )}

      {!playoff && <Summary row={ownRow} position={ownRow?.position ?? 0} total={ownTable.length} />}

      {form.length > 0 && (
        <div className="team-form" aria-label="Последние результаты">
          <span className="team-form-label">Форма</span>
          {/* Слева направо — от старых к новым, как читают ленту результатов. */}
          {[...form].reverse().map((match) => {
            const result = resultFor(match, info.id)
            return (
              <Link
                key={match.id}
                to={`/matches/${match.id}`}
                className={`form-badge form-badge--${result}`}
                title={`${formTitles[result]}: ${match.homeTeamName} ${match.homeScore}:${match.awayScore} ${match.awayTeamName}, ${formatDateTime(match.scheduledTimeUtc)}`}
              >
                {formLabels[result]}
              </Link>
            )
          })}
        </div>
      )}

      <div className={playoff ? 'stage-columns stage-columns--single' : 'stage-columns'}>
        <section>
          {upcoming.length > 0 && (
            <>
              <div className="section-head">
                <h2>Ближайшие матчи</h2>
              </div>
              <div className="competition competition--plain team-block">
                <div className="competition-body">
                  {upcoming.map((match) => (
                    <FixtureRow key={match.id} match={match} showDate />
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="section-head">
            <h2>Результаты</h2>
          </div>
          {results.length === 0 ? (
            <p className="notice">Сыгранных матчей на этом этапе пока нет.</p>
          ) : (
            <div className="competition competition--plain team-block">
              <div className="competition-body">
                {results.map((match) => (
                  <FixtureRow key={match.id} match={match} showDate />
                ))}
              </div>
            </div>
          )}
        </section>

        {!playoff && (
          <section>
            <div className="section-head">
              <h2>Таблица</h2>
            </div>
            <div className="competition competition--plain">
              <StandingsTable rows={standings} groups={standingsGroups} highlightTeamId={info.id} />
            </div>
          </section>
        )}
      </div>

      <div className="section-head">
        <h2>Состав</h2>
        <span className="muted">{activePlayers.length} игр.</span>
      </div>
      {players.length === 0 ? (
        <p className="notice">Состав на этот этап ещё не заявлен.</p>
      ) : (
        <div className="competition competition--plain team-block">
          {activePlayers.length > 0 ? (
            <RosterTable players={activePlayers} />
          ) : (
            <p className="notice" style={{ margin: 16 }}>
              Активных игроков в заявке нет.
            </p>
          )}

          {formerPlayers.length > 0 && (
            <details className="roster-former">
              <summary>Покинули команду ({formerPlayers.length})</summary>
              <RosterTable players={formerPlayers} />
            </details>
          )}
        </div>
      )}

      <p className="footnote">
        Статистика — только за матчи команды на выбранном этапе. М — матчи, в которых у игрока было
        событие; Г — голы, А — передачи, АГ — автоголы, ЖК/КК — карточки.
      </p>
    </>
  )
}
