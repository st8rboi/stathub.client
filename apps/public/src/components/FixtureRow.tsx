import { Link, useLocation } from 'react-router'
import type { PublicMatch } from '@/api/types'
import { useNow } from '@/hooks'
import { formatMinute, formatTime, isLiveMatch, periodElapsedSeconds } from '@/labels'

/** Откуда пришли на страницу матча — чтобы там была стрелка «назад» именно туда. */
export type MatchLinkState = { from: string }

/** Минута идущего матча (или «Пер.» на паузе) — красным между командами и счётом. */
function liveLabel(match: PublicMatch, nowMs: number): string {
  if (match.status === 'Pause') return 'Пер.'
  const elapsed = periodElapsedSeconds(match, nowMs)
  return elapsed === null ? 'LIVE' : formatMinute(match.currentPeriod, elapsed, match.periodDurationMinutes)
}

/**
 * Что стоит справа вместо счёта у матча без счёта: время начала у запланированного,
 * слово — только у нештатных статусов (отменён и т.п.).
 */
function sideLabel(match: PublicMatch): string {
  switch (match.status) {
    case 'Cancelled':
      return 'Отменён'
    default:
      return formatTime(match.scheduledTimeUtc)
  }
}

/** У завершённого матча победитель выделяется жирным. */
function winClass(own: number, other: number, finished: boolean): string {
  return finished && own > other ? ' fixture-line--win' : ''
}

function TeamLogo({ url }: { url: string | null }) {
  return url ? (
    <img src={url} alt="" className="team-logo team-logo--sm" />
  ) : (
    <span className="team-logo team-logo--sm team-logo--empty" />
  )
}

/**
 * Строка матча в стиле флешскора: слева две строки команд, справа —
 * идёт: красная минута + красный счёт; завершён: только счёт, победитель жирным;
 * запланирован: время начала; нештатный статус (отменён): короткое слово.
 */
export function FixtureRow({ match }: { match: PublicMatch }) {
  const location = useLocation()
  const live = isLiveMatch(match.status)
  const finished = match.status === 'Finished'
  const showScore = live || finished
  const now = useNow(match.status === 'InProgress', 5000)
  const linkState: MatchLinkState = { from: location.pathname + location.search }

  return (
    <Link
      to={`/matches/${match.id}`}
      state={linkState}
      className={live ? 'fixture fixture--live' : 'fixture'}
    >
      <span className="fixture-lines">
        <span className={'fixture-line' + winClass(match.homeScore, match.awayScore, finished)}>
          <TeamLogo url={match.homeTeamLogoUrl} />
          <span className="fixture-name">{match.homeTeamName}</span>
        </span>

        <span className={'fixture-line' + winClass(match.awayScore, match.homeScore, finished)}>
          <TeamLogo url={match.awayTeamLogoUrl} />
          <span className="fixture-name">{match.awayTeamName}</span>
        </span>
      </span>

      {live && <span className="fixture-minute">{liveLabel(match, now)}</span>}

      {showScore ? (
        <span className="fixture-scores">
          <span className="fixture-score">{match.homeScore}</span>
          <span className="fixture-score">{match.awayScore}</span>
        </span>
      ) : (
        <span className="fixture-status">{sideLabel(match)}</span>
      )}
    </Link>
  )
}
