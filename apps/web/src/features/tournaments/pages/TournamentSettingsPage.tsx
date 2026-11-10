import { useState } from 'react'
import { useNavigate } from 'react-router'
import { formatDate } from '@/shared/lib/format'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Card } from '@/shared/ui/layout'
import { EditTournamentForm } from '../components/EditTournamentForm'
import { useChangeTournamentStatus, useDeleteTournament } from '../hooks'
import { useTournamentOutlet } from '../tournamentOutlet'

/** Вкладка «Настройки» турнира: данные и необратимые действия. */
export default function TournamentSettingsPage() {
  const { tournament } = useTournamentOutlet()
  const { leagueId, id: tournamentId } = tournament
  const confirm = useConfirm()
  const navigate = useNavigate()

  const changeStatus = useChangeTournamentStatus(leagueId, tournamentId)
  const deleteTournament = useDeleteTournament(leagueId, tournamentId)
  const [editing, setEditing] = useState(false)

  const busy = changeStatus.isPending || deleteTournament.isPending
  const cancellable = tournament.status === 'Scheduled' || tournament.status === 'Active'

  return (
    <div className="settings">
      <Card
        title="Основные данные"
        actions={
          !editing && (
            <button type="button" className="secondary" onClick={() => setEditing(true)}>
              Изменить
            </button>
          )
        }
      >
        {editing ? (
          <EditTournamentForm tournament={tournament} onDone={() => setEditing(false)} />
        ) : (
          <dl>
            <dt>Название</dt>
            <dd>{tournament.name}</dd>
            <dt>Начало</dt>
            <dd>{formatDate(tournament.startDate)}</dd>
            <dt>Окончание</dt>
            <dd>{tournament.endDate ? formatDate(tournament.endDate) : 'не указано'}</dd>
          </dl>
        )}
      </Card>

      <Card title="Опасная зона" tone="danger">
        {cancellable && (
          <div className="danger-row">
            <div className="danger-row-text">
              <p className="danger-row-title">Отменить турнир</p>
              <p className="hint">Турнир получит статус «Отменён», вернуть его в работу будет нельзя.</p>
            </div>
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() =>
                void confirm({
                  title: 'Отменить турнир?',
                  message: 'Турнир получит статус «Отменён», вернуть его в работу будет нельзя.',
                  confirmLabel: 'Отменить турнир',
                  cancelLabel: 'Не отменять',
                  danger: true,
                }).then((ok) => {
                  if (ok) changeStatus.mutate('cancel')
                })
              }
            >
              Отменить
            </button>
          </div>
        )}
        <div className="danger-row">
          <div className="danger-row-text">
            <p className="danger-row-title">Удалить турнир</p>
            <p className="hint">
              Удаляется вместе с этапами. Только для турнира без заявок и матчей — иначе его можно отменить.
            </p>
          </div>
          <button
            type="button"
            className="danger"
            disabled={busy}
            onClick={() =>
              // Сервер откажет (409), если в турнире есть заявки или матчи.
              void confirm({
                title: `Удалить турнир «${tournament.name}»?`,
                message: 'Турнир удалится вместе с этапами. Это действие нельзя отменить.',
                confirmLabel: 'Удалить турнир',
                danger: true,
              }).then((ok) => {
                if (ok) deleteTournament.mutate(undefined, { onSuccess: () => void navigate(`/leagues/${leagueId}`) })
              })
            }
          >
            Удалить
          </button>
        </div>
        <ErrorText error={changeStatus.error ?? deleteTournament.error} />
      </Card>
    </div>
  )
}
