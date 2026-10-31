import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Skeleton } from '@/components/Skeleton'
import { publicKeys, useMatch } from '@/hooks'
import {
  eventTypeLabels,
  formatElapsed,
  formatTime,
  isLiveMatch,
  matchStatusLabels,
} from '@/labels'
import { useRealtime } from '@/realtime'

const eventMarkerClass: Record<string, string> = {
  Goal: 'event-marker event-marker--goal',
  OwnGoal: 'event-marker event-marker--goal',
  YellowCard: 'event-marker event-marker--yellow',
  RedCard: 'event-marker event-marker--red',
}

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

  if (!matchQuery.data) return <Skeleton rows={5} />

  const { match, events } = matchQuery.data

  // Первый период начинается с началом матча, поэтому строки «Начало периода» нумеруются со второго.
  let period = 1
  const eventTitle = (type: string) => {
    if (type !== 'PeriodStarted') return eventTypeLabels[type] ?? type
    period += 1
    return `${eventTypeLabels[type]} ${period}`
  }

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
          <div className={match.status === 'InProgress' ? 'matchboard-status live' : 'matchboard-status'}>
            {matchStatusLabels[match.status] ?? match.status}
          </div>
          {live && match.periodStartedAtUtc && (
            <div className="matchboard-clock">
              {match.currentPeriod}-й период · {formatElapsed(match, now)}
            </div>
          )}
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

      <p className="match-meta">
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
            {events.map((event) => {
              const detail = [
                event.teamName,
                event.playerName,
                event.isVoided ? 'отменено' : '',
                event.type === 'EventVoided' ? event.reason : '',
              ]
                .filter(Boolean)
                .join(' · ')

              return (
                <div key={event.id} className={event.isVoided ? 'event voided' : 'event'}>
                  <span className="event-time">{formatTime(event.occurredAtUtc)}</span>
                  <span className={eventMarkerClass[event.type] ?? 'event-marker'} aria-hidden="true" />
                  <span className="event-body">
                    <span className="event-title">{eventTitle(event.type)}</span>
                    {detail && <span className="event-detail">{detail}</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="footnote">
        Счёт обновляется автоматически. Если обновление задерживается, обновите страницу —
        данные придут из REST-состояния матча.
      </p>
    </>
  )
}
