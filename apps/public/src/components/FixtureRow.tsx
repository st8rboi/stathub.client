import { Link } from 'react-router'
import type { PublicMatch } from '@/api/types'
import { formatTime, isLiveMatch, matchStatusLabels } from '@/labels'

function statusBadge(match: PublicMatch): { className: string; label: string } {
  if (match.status === 'InProgress') return { className: 'badge live', label: 'LIVE' }
  if (match.status === 'Pause') return { className: 'badge pause', label: 'ПАУЗА' }
  if (match.status === 'Finished') return { className: 'badge', label: 'FT' }
  return { className: 'badge', label: formatTime(match.scheduledTimeUtc) }
}

/**
 * Строка матча в стиле флешскора: две строки команд с логотипами, справа —
 * время начала или счёт. Счёт показывается только у идущих и завершённых матчей.
 */
export function FixtureRow({ match }: { match: PublicMatch }) {
  const badge = statusBadge(match)
  const showScore = isLiveMatch(match.status) || match.status === 'Finished'
  const live = match.status === 'InProgress'

  return (
    <Link to={`/matches/${match.id}`} className={live ? 'fixture fixture--live' : 'fixture'}>
      <div className="fixture-lines">
        <div className="fixture-line">
          {match.homeTeamLogoUrl ? (
            <img src={match.homeTeamLogoUrl} alt="" className="team-logo" />
          ) : (
            <span className="team-logo team-logo--empty" />
          )}
          <span className="fixture-name">{match.homeTeamName}</span>
          {showScore && <span className="fixture-score">{match.homeScore}</span>}
        </div>

        <div className="fixture-line">
          {match.awayTeamLogoUrl ? (
            <img src={match.awayTeamLogoUrl} alt="" className="team-logo" />
          ) : (
            <span className="team-logo team-logo--empty" />
          )}
          <span className="fixture-name">{match.awayTeamName}</span>
          {showScore && <span className="fixture-score">{match.awayScore}</span>}
        </div>
      </div>

      <div className="fixture-side">
        <span className={badge.className}>{badge.label}</span>
        <span className="fixture-hint">
          {match.status === 'Pause'
            ? `${match.currentPeriod}-й период`
            : isLiveMatch(match.status)
              ? matchStatusLabels[match.status]
              : ''}
        </span>
      </div>
    </Link>
  )
}
