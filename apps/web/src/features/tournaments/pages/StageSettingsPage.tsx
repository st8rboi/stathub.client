import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Card } from '@/shared/ui/layout'
import { Modal } from '@/shared/ui/Modal'
import { StageForm } from '../components/StageForm'
import { useDeleteStage, useUpdateStage } from '../hooks'
import { stageFormatLabels } from '../labels'
import { useStageOutlet } from '../stageOutlet'

/** Вкладка «Настройки» этапа: регламент и удаление. */
export default function StageSettingsPage() {
  const { tournament, stage } = useStageOutlet()
  const confirm = useConfirm()
  const navigate = useNavigate()

  const updateStage = useUpdateStage(tournament.leagueId, tournament.id)
  const deleteStage = useDeleteStage(tournament.leagueId, tournament.id)
  const [editing, setEditing] = useState(false)

  // Правила этапа меняются только до старта турнира.
  const rulesLocked = tournament.status !== 'Scheduled'
  const yesNo = (value: boolean) => (value ? 'да' : 'нет')

  return (
    <div className="settings">
      <Card
        title="Регламент"
        actions={
          <button
            type="button"
            className="secondary"
            onClick={() => {
              updateStage.reset()
              setEditing(true)
            }}
          >
            Изменить
          </button>
        }
      >
        <dl>
          <dt>Название</dt>
          <dd>{stage.name}</dd>
          <dt>Формат</dt>
          <dd>{stageFormatLabels[stage.formatType]}</dd>
          <dt>Очки</dt>
          <dd>
            победа {stage.winPoints}, ничья {stage.drawPoints}, поражение {stage.lossPoints}
          </dd>
          <dt>Матч</dt>
          <dd>
            {stage.periodsCount} × {stage.periodDurationMinutes} мин
          </dd>
          <dt>Доп. время</dt>
          <dd>{yesNo(stage.extraTimeEnabled)}</dd>
          <dt>Серия пенальти</dt>
          <dd>{yesNo(stage.penaltyShootoutEnabled)}</dd>
        </dl>
        {rulesLocked && <p className="hint">Турнир уже начат — правила этапа менять нельзя, только название.</p>}
      </Card>

      <Card title="Опасная зона" tone="danger">
        <div className="danger-row">
          <div className="danger-row-text">
            <p className="danger-row-title">Удалить этап</p>
            <p className="hint">Только для этапа без заявок и матчей. Действие нельзя отменить.</p>
          </div>
          <button
            type="button"
            className="danger"
            disabled={deleteStage.isPending}
            onClick={() =>
              void confirm({
                title: `Удалить этап «${stage.name}»?`,
                message: 'Этап с заявками или матчами удалить не получится.',
                confirmLabel: 'Удалить',
                danger: true,
              }).then((ok) => {
                // Сервер откажет (409), если в этапе есть заявки или матчи.
                if (ok)
                  deleteStage.mutate(stage.id, {
                    onSuccess: () => void navigate(`/leagues/${tournament.leagueId}/tournaments/${tournament.id}`),
                  })
              })
            }
          >
            Удалить
          </button>
        </div>
        <ErrorText error={deleteStage.error} />
      </Card>

      <Modal open={editing} onClose={() => setEditing(false)} title={`Этап «${stage.name}»`}>
        <StageForm
          initial={stage}
          submitLabel="Сохранить"
          pending={updateStage.isPending}
          error={updateStage.error}
          rulesLocked={rulesLocked}
          onSubmit={(body) => updateStage.mutate({ stageId: stage.id, body }, { onSuccess: () => setEditing(false) })}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </div>
  )
}
