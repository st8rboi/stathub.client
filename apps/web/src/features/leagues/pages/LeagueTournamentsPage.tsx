import { useState } from 'react'
import { Link } from 'react-router'
import { CreateTournamentForm } from '@/features/tournaments/components/CreateTournamentForm'
import { useTournaments } from '@/features/tournaments/hooks'
import { tournamentStatusLabels, tournamentStatusTones } from '@/features/tournaments/labels'
import type { TournamentStatus, TournamentSummary } from '@/features/tournaments/types'
import { formatDateRange, plural } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Badge, EmptyState, Loading } from '@/shared/ui/layout'
import { Modal } from '@/shared/ui/Modal'
import { useLeagueOutlet } from '../leagueOutlet'

const CURRENT_STATUSES: TournamentStatus[] = ['Active', 'Scheduled']

/** Текущие: сначала идущие, потом запланированные, внутри — по дате начала. */
const byCurrentOrder = (a: TournamentSummary, b: TournamentSummary) =>
  CURRENT_STATUSES.indexOf(a.status) - CURRENT_STATUSES.indexOf(b.status) || a.startDate.localeCompare(b.startDate)

/** Прошедшие: свежие сверху. */
const byNewestFirst = (a: TournamentSummary, b: TournamentSummary) => b.startDate.localeCompare(a.startDate)

/** Вкладка «Турниры» страницы лиги. */
export default function LeagueTournamentsPage() {
  const { league } = useLeagueOutlet()
  const tournaments = useTournaments(league.id)
  const [creating, setCreating] = useState(false)

  const canCreate = league.status !== 'Archived'
  const list = tournaments.data ?? []
  const current = list.filter((t) => CURRENT_STATUSES.includes(t.status)).sort(byCurrentOrder)
  const past = list.filter((t) => !CURRENT_STATUSES.includes(t.status)).sort(byNewestFirst)

  const createButton = canCreate && (
    <button type="button" onClick={() => setCreating(true)}>
      <Icon name="plus" size={18} />
      Новый турнир
    </button>
  )

  return (
    <>
      <ErrorText error={tournaments.error} />
      {tournaments.isPending && <Loading />}

      {tournaments.data?.length === 0 && (
        <EmptyState icon="trophy" title="Турниров пока нет" action={createButton || undefined}>
          Турнир — это сезон или кубок лиги. Внутри него создаются этапы: группы, дивизионы, плей-офф.
        </EmptyState>
      )}

      {list.length > 0 && (
        <>
          <div className="toolbar">
            <p className="muted">{plural(list.length, ['турнир', 'турнира', 'турниров'])}</p>
            {createButton}
          </div>

          {current.length > 0 && (
            <TournamentGroup title="Идут и запланированы" leagueId={league.id} tournaments={current} />
          )}
          {past.length > 0 && (
            <TournamentGroup title="Завершённые и отменённые" leagueId={league.id} tournaments={past} muted />
          )}
        </>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый турнир">
        <CreateTournamentForm leagueId={league.id} onCancel={() => setCreating(false)} />
      </Modal>
    </>
  )
}

function TournamentGroup({
  title,
  leagueId,
  tournaments,
  muted = false,
}: {
  title: string
  leagueId: string
  tournaments: TournamentSummary[]
  muted?: boolean
}) {
  return (
    <section>
      <h2 className="group-title">{title}</h2>
      <ul className="entity-grid">
        {tournaments.map((tournament) => (
          <li key={tournament.id}>
            <Link
              to={`/leagues/${leagueId}/tournaments/${tournament.id}`}
              className={muted ? 'entity-card entity-card--muted' : 'entity-card'}
            >
              <span className="entity-card-icon">
                <Icon name="trophy" />
              </span>
              <span className="entity-card-body">
                <span className="entity-card-title">{tournament.name}</span>
                <span className="entity-card-meta">
                  <Badge tone={tournamentStatusTones[tournament.status]}>
                    {tournamentStatusLabels[tournament.status]}
                  </Badge>
                  <span>{formatDateRange(tournament.startDate, tournament.endDate)}</span>
                </span>
              </span>
              <Icon name="chevron-right" className="entity-card-chevron" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
