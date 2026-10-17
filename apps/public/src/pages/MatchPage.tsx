import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { publicKeys, useMatch } from '@/hooks'
import {
  eventTypeLabels,
  formatElapsed,
  formatTime,
  isLiveMatch,
  matchStatusLabels,
} from '@/labels'
import { useRealtime } from '@/realtime'

export default function MatchPage() {
  const { matchId = '' } = useParams()
  const queryClient = useQueryClient()
  const matchQuery = useMatch(matchId)

  const [now, setNow] = useState(() => Date.now())

  // Пуш — сигнал «перечитай состояние»; сам счёт всегда берётся из REST (doc §4, §9).
  useRealtime({ matchId }, () => {
    void queryClient.invalidateQueries({ queryKey: publicKeys.match(matchId) })
  })

  const status = matchQuery.data?.match.status
  const live = status ? isLiveMatch(status) : false

  useEffect(() => {
    if (!live) return

    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [live, matchId])

  if (matchQuery.error) {
    return <p className="notice">Не удалось загрузить матч: {matchQuery.error.message}</p>
  }

  if (!matchQuery.data) return <p className="muted">Загрузка…</p>

  const { match, events } = matchQuery.data

  return (
    <>
      <p className="crumb">
        <Link to={`/leagues/${match.leagueSlug}`}>← {match.leagueName}</Link> ·{' '}
        <Link to={`/stages/${match.stageId}`}>{match.stageName}</Link>
      </p>

      <div className="matchboard">
        <div className="matchboard-team">
          {match.homeTeamLogoUrl ? (
            <img src={match.homeTeamLogoUrl} alt="" className="team-logo team-logo--lg" />
          ) : (
            <span className="team-logo team-logo--lg team-logo--empty" />
          )}
          <span className="matchboard-name">{match.homeTeamName}</span>
        </div>

        <div className="matchboard-center">
          <div className="matchboard-score">
            {match.homeScore} : {match.awayScore}
          </div>
          <div className={live ? 'matchboard-status live' : 'matchboard-status'}>
            {matchStatusLabels[match.status] ?? match.status}
            {live && match.periodStartedAtUtc
              ? ` · ${match.currentPeriod}-й период · ${formatElapsed(match.periodStartedAtUtc, now)}`
              : ''}
          </div>
        </div>

        <div className="matchboard-team matchboard-team--away">
          {match.awayTeamLogoUrl ? (
            <img src={match.awayTeamLogoUrl} alt="" className="team-logo team-logo--lg" />
          ) : (
            <span className="team-logo team-logo--lg team-logo--empty" />
          )}
          <span className="matchboard-name">{match.awayTeamName}</span>
        </div>
      </div>

      <p className="muted">
        {match.tournamentName} · {formatTime(match.scheduledTimeUtc)} · {match.stageName}
      </p>

      <div className="section-head">
        <h2>Протокол</h2>
      </div>

      {events.length === 0 ? (
        <p className="notice">Событий пока нет.</p>
      ) : (
        <div className="competition competition--plain">
          <div className="events">
            {events.map((event) => (
              <div key={event.id} className={event.isVoided ? 'event voided' : 'event'}>
                <span className="event-title">
                  <strong>{eventTypeLabels[event.type] ?? event.type}</strong>
                  {event.teamName ? ` · ${event.teamName}` : ''}
                  {event.playerName ? ` · ${event.playerName}` : ''}
                  {event.isVoided ? ' · отменено' : ''}
                  {event.type === 'EventVoided' && event.reason ? ` — ${event.reason}` : ''}
                </span>
                <span className="event-time">{formatTime(event.clientTimestampUtc)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="muted" style={{ marginTop: 16 }}>
        Счёт обновляется автоматически. Если обновление задерживается, обновите страницу —
        данные придут из REST-состояния матча.
      </p>
    </>
  )
}
