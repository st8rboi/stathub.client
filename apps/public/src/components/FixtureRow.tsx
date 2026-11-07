import { Link, useLocation } from 'react-router'
import type { PublicMatch } from '@/api/types'
import { useNow } from '@/hooks'
import { formatMinute, formatTime, isLiveMatch, periodElapsedSeconds } from '@/labels'

/** Откуда пришли на страницу матча — чтобы там была стрелка «назад» именно туда. */
export type MatchLinkState = { from: string }

function statusLabel(match: PublicMatch, nowMs: number): string {
  switch (match.status) {
    case 'InProgress': {
      // Вместо «LIVE» — минута матча, как на флешскоре.
      const elapsed = periodElapsedSeconds(match, nowMs)
      return elapsed === null ? 'LIVE' : formatMinute(match.currentPeriod, elapsed, match.periodDurationMinutes)
    }
    case 'Pause':
      return 'Пер.'
    case 'Finished':
      return 'Заверш.'
    case 'Cancelled':
      return 'Отменён'
    default:
      return formatTime(match.scheduledTimeUtc)
  }
}

/** У завершённого матча победитель выделяется жирным, проигравший приглушается. */
function resultClass(own: number, other: number, finished: boolean): string {
  if (!finished || own === other) return ''
  return own > other ? ' fixture-line--win' : ' fixture-line--lose'
}

function TeamLogo({ url }: { url: string | null }) {
  return url ? (
    <img src={url} alt="" className="team-logo team-logo--sm" />
  ) : (
    <span className="team-logo team-logo--sm team-logo--empty" />
  )
}

/**
 * Строка матча в стиле флешскора: слева статус (время, минута идущего матча, пауза), по центру
 * две строки команд, справа счёт. Счёт есть только у идущих и завершённых матчей.
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
      <span className={live ? 'fixture-status live' : 'fixture-status'}>{statusLabel(match, now)}</span>

      <span className="fixture-lines">
        <span className={'fixture-line' + resultClass(match.homeScore, match.awayScore, finished)}>
          <TeamLogo url={match.homeTeamLogoUrl} />
          <span className="fixture-name">{match.homeTeamName}</span>
          <span className="fixture-score">{showScore ? match.homeScore : ''}</span>
        </span>

        <span className={'fixture-line' + resultClass(match.awayScore, match.homeScore, finished)}>
          <TeamLogo url={match.awayTeamLogoUrl} />
          <span className="fixture-name">{match.awayTeamName}</span>
          <span className="fixture-score">{showScore ? match.awayScore : ''}</span>
        </span>
      </span>
    </Link>
  )
}
