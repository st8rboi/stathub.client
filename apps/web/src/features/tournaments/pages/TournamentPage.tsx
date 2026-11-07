import { Link, useParams } from 'react-router'
import { ErrorText } from '@/shared/ui/ErrorText'
import { TournamentFeesSection } from '@/features/finance/components/TournamentFeesSection'
import { DisciplineSection } from '@/features/discipline/DisciplineSection'
import { AddStageForm } from '../components/AddStageForm'
import { StagesTable } from '../components/StagesTable'
import { useChangeTournamentStatus, useTournament } from '../hooks'
import { tournamentStatusLabels } from '../labels'

export default function TournamentPage() {
  const { leagueId = '', tournamentId = '' } = useParams()

  const tournament = useTournament(leagueId, tournamentId)
  const changeStatus = useChangeTournamentStatus(leagueId, tournamentId)

  if (tournament.error) return <ErrorText error={tournament.error} />
  if (!tournament.data) return <p>Загрузка…</p>

  const { data } = tournament

  return (
    <>
      <p>
        <Link to={`/leagues/${leagueId}`}>← К лиге</Link>
      </p>
      <h1>{data.name}</h1>

      <dl>
        <dt>Статус</dt>
        <dd>{tournamentStatusLabels[data.status]}</dd>
        <dt>Даты</dt>
        <dd>
          {data.startDate} — {data.endDate ?? '…'}
        </dd>
      </dl>

      <div className="actions">
        {data.status === 'Scheduled' && (
          <button disabled={changeStatus.isPending} onClick={() => changeStatus.mutate('start')}>
            Начать турнир
          </button>
        )}
        {data.status === 'Active' && (
          <button disabled={changeStatus.isPending} onClick={() => changeStatus.mutate('complete')}>
            Завершить турнир
          </button>
        )}
        {(data.status === 'Scheduled' || data.status === 'Active') && (
          <button
            className="danger"
            disabled={changeStatus.isPending}
            onClick={() => {
              if (confirm('Отменить турнир?')) changeStatus.mutate('cancel')
            }}
          >
            Отменить
          </button>
        )}
      </div>
      <ErrorText error={changeStatus.error} />

      <h2>Участники</h2>
      <p className="notice">
        Команды заявляются на конкретный этап (дивизион): откройте этап ниже и добавьте участников
        там — у каждой группы свой состав.
      </p>

      <h2>Этапы</h2>
      <StagesTable leagueId={leagueId} tournamentId={tournamentId} stages={data.stages} />

      <h2>Взносы</h2>
      <TournamentFeesSection tournamentId={tournamentId} />

      <h2>Дисциплинарные</h2>
      <DisciplineSection
        tournamentId={tournamentId}
        stages={data.stages.map((stage) => ({ id: stage.id, name: stage.name }))}
      />

      {data.status === 'Scheduled' ? (
        <>
          <h2>Новый этап</h2>
          <AddStageForm leagueId={leagueId} tournamentId={tournamentId} />
        </>
      ) : (
        <p className="notice">Этапы можно добавлять только в запланированный турнир.</p>
      )}
    </>
  )
}
