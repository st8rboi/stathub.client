import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { matchStatusLabels, matchStatusTones } from '@/features/matches/labels'
import { formatDayHeading, formatTime } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Badge, EmptyState, Loading } from '@/shared/ui/layout'
import { statisticianApi, statisticianKeys } from '../api'
import type { AssignedMatch } from '../types'

const order: Record<AssignedMatch['status'], number> = {
  InProgress: 0,
  Pause: 0,
  Scheduled: 1,
  Finished: 2,
  Cancelled: 3,
}

/** «Мои матчи» статистика: идущие сверху, затем ближайшие, затем завершённые. */
export default function StatMatchesPage() {
  const matches = useQuery({
    queryKey: statisticianKeys.matches(),
    queryFn: statisticianApi.myMatches,
    refetchInterval: 30_000,
  })

  const sorted = [...(matches.data ?? [])].sort(
    (a, b) =>
      order[a.status] - order[b.status] ||
      (a.status === 'Finished' ? -1 : 1) * a.scheduledTimeUtc.localeCompare(b.scheduledTimeUtc),
  )

  return (
    <>
      <h1 className="stat-title">Мои матчи</h1>
      <ErrorText error={matches.error} />
      {matches.isPending && <Loading />}

      {matches.data?.length === 0 && (
        <EmptyState icon="chart" title="Назначений пока нет">
          Организатор назначит вас на матч — он появится здесь автоматически.
        </EmptyState>
      )}

      {sorted.length > 0 && (
        <ul className="stat-match-list">
          {sorted.map((match) => {
            const started = match.status !== 'Scheduled' && match.status !== 'Cancelled'

            return (
              <li key={match.id}>
                <Link to={`/stats/${match.id}`} className="stat-match-card">
                  <span className="stat-match-teams">
                    <span>{match.homeTeamName}</span>
                    <span>{match.awayTeamName}</span>
                  </span>
                  <span className="stat-match-score">
                    {started ? `${match.homeScore}:${match.awayScore}` : formatTime(match.scheduledTimeUtc)}
                  </span>
                  <span className="stat-match-meta">
                    <Badge tone={matchStatusTones[match.status]}>{matchStatusLabels[match.status]}</Badge>
                    <span className="hint">
                      {formatDayHeading(match.scheduledTimeUtc)}
                      {match.stageName ? ` · ${match.stageName}` : ''}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
