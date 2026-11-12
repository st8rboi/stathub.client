import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router'
import type { PublicEvent, PublicMatch } from '@/api/types'
import type { MatchLinkState } from '@/components/FixtureRow'
import { MatchEventIcon } from '@/components/MatchEventIcon'
import { teamPath } from '@/components/TeamLink'
import { Skeleton } from '@/components/Skeleton'
import { publicKeys, useMatch, useNow } from '@/hooks'
import {
  eventTypeLabels,
  formatElapsed,
  formatMinute,
  formatTime,
  isLiveMatch,
  matchStatusLabels,
  shortPlayerName,
} from '@/labels'
import { competitionLabel } from '@/labels'
import { useRealtime } from '@/realtime'

type Side = 'home' | 'away'

type PeriodRow = { kind: 'period'; key: string; period: number; home: number; away: number }

type EventRow = {
  kind: 'event'
  key: string
  event: PublicEvent
  side: Side
  minute: string
  /** Счёт после гола — только у засчитанных голов. */
  score: [number, number] | null
  voidReason: string | null
}

/** Служебные события не показываем строками: начало периодов — заголовки, отмена — зачёркивание. */
const HIDDEN_EVENTS = new Set(['EventVoided', 'MatchFinished', 'MatchPaused', 'MatchResumed'])

function periodTitle(period: number, periodsCount: number): string {
  return periodsCount === 2 && period <= 2 ? `${period}-й тайм` : `${period}-й период`
}

function sideOf(event: PublicEvent, match: PublicMatch): Side {
  if (event.teamId) return event.teamId === match.awayTeamId ? 'away' : 'home'
  return event.teamName !== null && event.teamName === match.awayTeamName ? 'away' : 'home'
}

/**
 * Протокол в виде флешскора: события разложены по периодам и по сторонам (хозяева слева,
 * гости справа), у гола — счёт после него. Отменённые события остаются, но зачёркнуты;
 * сами строки «Отмена события» не показываются, чтобы отмена была видна в одном месте.
 */
function buildProtocol(match: PublicMatch, events: PublicEvent[]): (PeriodRow | EventRow)[] {
  const rows: (PeriodRow | EventRow)[] = []

  const voidReasons = new Map<string, string | null>()
  for (const event of events) {
    if (event.type === 'EventVoided' && event.targetEventId) voidReasons.set(event.targetEventId, event.reason)
  }

  // Текущий период держим в объекте: замыкание openPeriod меняет его по ходу цикла.
  const clock: { period: PeriodRow | null; startMs: number | null } = { period: null, startMs: null }
  let home = 0
  let away = 0

  const openPeriod = (number: number, startedAtUtc: string | null, key: string): PeriodRow => {
    const row: PeriodRow = { kind: 'period', key, period: number, home: 0, away: 0 }
    clock.period = row
    clock.startMs = startedAtUtc ? new Date(startedAtUtc).getTime() : null
    rows.push(row)
    return row
  }

  for (const event of events) {
    if (event.type === 'MatchStarted') {
      openPeriod(1, event.occurredAtUtc, event.id)
      continue
    }

    if (event.type === 'PeriodStarted') {
      openPeriod((clock.period?.period ?? 1) + 1, event.occurredAtUtc, event.id)
      continue
    }

    if (HIDDEN_EVENTS.has(event.type)) continue

    // Событие без «Начала матча» (старые данные) — всё равно кладём в первый период.
    const current = clock.period ?? openPeriod(1, null, `period-${event.id}`)

    const side = sideOf(event, match)
    let score: [number, number] | null = null

    if ((event.type === 'Goal' || event.type === 'OwnGoal') && !event.isVoided) {
      // Автогол засчитывается сопернику команды игрока.
      const scoringSide = event.type === 'OwnGoal' ? (side === 'home' ? 'away' : 'home') : side

      if (scoringSide === 'home') {
        home += 1
        current.home += 1
      } else {
        away += 1
        current.away += 1
      }

      score = [home, away]
    }

    // Сервер отдаёт игровое время без пауз; если его нет — считаем от начала периода.
    const fallbackSeconds =
      clock.startMs === null ? 0 : (new Date(event.occurredAtUtc).getTime() - clock.startMs) / 1000
    const minute = formatMinute(
      event.period ?? current.period,
      event.elapsedSeconds ?? fallbackSeconds,
      match.periodDurationMinutes,
    )

    rows.push({
      kind: 'event',
      key: event.id,
      event,
      side,
      minute,
      score,
      voidReason: event.isVoided ? (voidReasons.get(event.id) ?? null) : null,
    })
  }

  return rows
}

function EventLine({ row }: { row: EventRow }) {
  const { event } = row
  const player = event.playerName ? shortPlayerName(event.playerName) : null
  const related = event.relatedPlayerName ? shortPlayerName(event.relatedPlayerName) : null

  const note =
    event.type === 'OwnGoal' ? 'автогол' : event.type === 'Goal' || event.type === 'Substitution' ? related : null

  const title = event.isVoided
    ? `Отменено судьёй${row.voidReason ? `: ${row.voidReason}` : ''}`
    : (eventTypeLabels[event.type] ?? event.type)

  const isGoal = event.type === 'Goal' || event.type === 'OwnGoal'
  const className = ['pe', `pe--${row.side}`, isGoal ? 'pe--goal' : '', event.isVoided ? 'pe--voided' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} title={title}>
      <span className="pe-minute">{row.minute}</span>
      <span className="pe-badge">
        <MatchEventIcon type={event.type} />
        {row.score && (
          <span className="pe-score">
            {row.score[0]} - {row.score[1]}
          </span>
        )}
      </span>
      <span className="pe-text">
        <span className="pe-player">{player ?? eventTypeLabels[event.type] ?? event.type}</span>
        {note && <span className="pe-note">({note})</span>}
        {event.isVoided && <span className="visually-hidden">, отменено судьёй</span>}
      </span>
    </div>
  )
}

export default function MatchPage() {
  const { matchId = '' } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const matchQuery = useMatch(matchId)

  // Пуш — сигнал «перечитай состояние»; сам счёт всегда берётся из REST (doc §4, §9).
  useRealtime({ matchId }, () => {
    void queryClient.invalidateQueries({ queryKey: publicKeys.match(matchId) })
  })

  const status = matchQuery.data?.match.status
  const live = status ? isLiveMatch(status) : false
  const now = useNow(live)

  if (matchQuery.error) {
    return <p className="notice">Не удалось загрузить матч: {matchQuery.error.message}</p>
  }

  if (!matchQuery.data) return <Skeleton rows={5} />

  const { match, events } = matchQuery.data
  const protocol = buildProtocol(match, events)

  // С главной (ленты матчей) возвращаемся туда же, а не только в лигу или этап.
  const from = (location.state as MatchLinkState | null)?.from
  const fromHome = from === '/' || from?.startsWith('/?')

  return (
    <>
      <p className="crumb">
        {fromHome ? (
          <>
            <Link to={from!}>← Матчи</Link> · <Link to={`/leagues/${match.leagueSlug}`}>{match.leagueName}</Link>
          </>
        ) : (
          <Link to={`/leagues/${match.leagueSlug}`}>← {match.leagueName}</Link>
        )}{' '}
        · <Link to={`/stages/${match.stageId}`}>{competitionLabel(match.stageName, match.divisionName)}</Link>
      </p>

      <div className="matchboard">
        <Link to={teamPath(match.homeTeamId)} className="matchboard-team team-link">
          {match.homeTeamLogoUrl ? (
            <img src={match.homeTeamLogoUrl} alt="" className="team-logo team-logo--lg" />
          ) : (
            <span className="team-logo team-logo--lg team-logo--empty" />
          )}
          <span className="matchboard-name">{match.homeTeamName}</span>
        </Link>

        <div className="matchboard-center">
          <div className="matchboard-score">
            {match.homeScore} : {match.awayScore}
          </div>
          <div className={match.status === 'InProgress' ? 'matchboard-status live' : 'matchboard-status'}>
            {matchStatusLabels[match.status] ?? match.status}
          </div>
          {live && match.periodStartedAtUtc && (
            <div className="matchboard-clock">
              {match.currentPeriod}-й период · {formatElapsed(match, now)}
            </div>
          )}
        </div>

        <Link to={teamPath(match.awayTeamId)} className="matchboard-team matchboard-team--away team-link">
          {match.awayTeamLogoUrl ? (
            <img src={match.awayTeamLogoUrl} alt="" className="team-logo team-logo--lg" />
          ) : (
            <span className="team-logo team-logo--lg team-logo--empty" />
          )}
          <span className="matchboard-name">{match.awayTeamName}</span>
        </Link>
      </div>

      <p className="match-meta">
        {match.tournamentName} · {formatTime(match.scheduledTimeUtc)} ·{' '}
        {competitionLabel(match.stageName, match.divisionName)}
      </p>

      <div className="section-head">
        <h2>Протокол</h2>
      </div>

      {protocol.length === 0 ? (
        <p className="notice">Событий пока нет.</p>
      ) : (
        <div className="competition competition--plain protocol-card">
          <div className="protocol">
            {protocol.map((row) =>
              row.kind === 'period' ? (
                <div key={row.key} className="protocol-period">
                  <span>{periodTitle(row.period, match.periodsCount)}</span>
                  <span className="protocol-period-score">
                    {row.home} - {row.away}
                  </span>
                </div>
              ) : (
                <EventLine key={row.key} row={row} />
              ),
            )}
          </div>
        </div>
      )}

      <p className="footnote">
        Счёт обновляется автоматически. Если обновление задерживается, обновите страницу —
        данные придут из REST-состояния матча. Зачёркнутые события отменены судьёй.
      </p>
    </>
  )
}
