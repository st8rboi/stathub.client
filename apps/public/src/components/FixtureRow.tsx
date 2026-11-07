import { Link } from 'react-router'
import type { PublicMatch } from '@/api/types'
import { formatTime, isLiveMatch } from '@/labels'

function statusLabel(match: PublicMatch): string {
  switch (match.status) {
    case 'InProgress':
      return 'LIVE'
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
 * Строка матча в стиле флешскора: слева статус (время, LIVE, пауза), по центру
 * две строки команд, справа счёт. Счёт есть только у идущих и завершённых матчей.
 */
export function FixtureRow({ match }: { match: PublicMatch }) {
  const live = isLiveMatch(match.status)
  const finished = match.status === 'Finished'
  const showScore = live || finished

  return (
    <Link to={`/matches/${match.id}`} className={live ? 'fixture fixture--live' : 'fixture'}>
      <span className={live ? 'fixture-status live' : 'fixture-status'}>{statusLabel(match)}</span>

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
