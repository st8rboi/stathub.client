import { useState } from 'react'
import { Link } from 'react-router'
import { plural } from '@/shared/lib/format'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { EmptyState } from '@/shared/ui/layout'
import { Menu, MenuButton } from '@/shared/ui/Menu'
import { Modal } from '@/shared/ui/Modal'
import { StageForm } from '../components/StageForm'
import { useAddStage, useDeleteStage, useUpdateStage } from '../hooks'
import { stageFormatLabels } from '../labels'
import type { Stage } from '../types'
import { useTournamentOutlet } from '../tournamentOutlet'

/** Вкладка «Этапы»: карточки этапов, добавление и правка в модальном окне. */
export default function TournamentStagesPage() {
  const { tournament } = useTournamentOutlet()
  const { leagueId, id: tournamentId, stages } = tournament
  const confirm = useConfirm()

  const addStage = useAddStage(leagueId, tournamentId)
  const updateStage = useUpdateStage(leagueId, tournamentId)
  const deleteStage = useDeleteStage(leagueId, tournamentId)

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = stages.find((stage) => stage.id === editingId)

  // Этапы добавляются и правила меняются только до старта турнира.
  const canAdd = tournament.status === 'Scheduled'
  const rulesLocked = tournament.status !== 'Scheduled'

  const openAdd = () => {
    addStage.reset()
    setAdding(true)
  }

  const addButton = canAdd && (
    <button type="button" onClick={openAdd}>
      <Icon name="plus" size={18} />
      Новый этап
    </button>
  )

  const remove = (stage: Stage) =>
    void confirm({
      title: `Удалить этап «${stage.name}»?`,
      message: 'Этап с заявками или матчами удалить не получится.',
      confirmLabel: 'Удалить',
      danger: true,
    }).then((ok) => {
      // Сервер откажет (409), если в этапе есть заявки или матчи.
      if (ok) deleteStage.mutate(stage.id)
    })

  return (
    <>
      {stages.length === 0 ? (
        <EmptyState icon="layers" title="Этапов пока нет" action={addButton || undefined}>
          Этап — это группа, дивизион или раунд плей-офф. Команды заявляются на этап, матчи тоже играются внутри этапа.
          {!canAdd && ' Этапы можно добавлять только в запланированный турнир.'}
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <p className="muted">
              {plural(stages.length, ['этап', 'этапа', 'этапов'])} · откройте этап, чтобы заявить команды и
              составить расписание
            </p>
            {addButton}
          </div>

          {rulesLocked && (
            <p className="notice">
              Турнир уже начат: новые этапы добавлять нельзя, у существующих меняется только название.
            </p>
          )}

          <ol className="stage-list">
            {[...stages]
              .sort((a, b) => a.order - b.order)
              .map((stage) => (
                <li key={stage.id} className="stage-card">
                  <span className="stage-order" aria-hidden="true">
                    {stage.order}
                  </span>
                  <div className="stage-card-body">
                    <Link
                      to={`/leagues/${leagueId}/tournaments/${tournamentId}/stages/${stage.id}`}
                      className="stage-card-link"
                    >
                      {stage.name}
                    </Link>
                    <span className="entity-card-meta">
                      <span>{stageFormatLabels[stage.formatType]}</span>
                      <span>
                        Очки {stage.winPoints}/{stage.drawPoints}/{stage.lossPoints}
                      </span>
                      <span>
                        {stage.periodsCount} × {stage.periodDurationMinutes} мин
                        {stage.extraTimeEnabled && ', доп. время'}
                        {stage.penaltyShootoutEnabled && ', пенальти'}
                      </span>
                    </span>
                  </div>
                  <Menu
                    triggerClassName="icon-button"
                    triggerLabel={`Действия с этапом «${stage.name}»`}
                    trigger={<Icon name="more" />}
                    align="end"
                  >
                    <MenuButton
                      onClick={() => {
                        updateStage.reset()
                        setEditingId(stage.id)
                      }}
                    >
                      Изменить
                    </MenuButton>
                    <MenuButton danger disabled={deleteStage.isPending} onClick={() => remove(stage)}>
                      Удалить
                    </MenuButton>
                  </Menu>
                </li>
              ))}
          </ol>
          <ErrorText error={deleteStage.error} />
        </>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Новый этап">
        <StageForm
          submitLabel="Добавить этап"
          pending={addStage.isPending}
          error={addStage.error}
          onSubmit={(body) => addStage.mutate(body, { onSuccess: () => setAdding(false) })}
          onCancel={() => setAdding(false)}
        />
      </Modal>

      <Modal open={editing !== undefined} onClose={() => setEditingId(null)} title={`Этап «${editing?.name ?? ''}»`}>
        {editing && (
          <StageForm
            key={editing.id}
            initial={editing}
            submitLabel="Сохранить"
            pending={updateStage.isPending}
            error={updateStage.error}
            rulesLocked={rulesLocked}
            onSubmit={(body) =>
              updateStage.mutate({ stageId: editing.id, body }, { onSuccess: () => setEditingId(null) })
            }
            onCancel={() => setEditingId(null)}
          />
        )}
      </Modal>
    </>
  )
}
