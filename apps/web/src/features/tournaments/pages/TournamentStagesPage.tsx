import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import { plural } from '@/shared/lib/format'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Card, EmptyState } from '@/shared/ui/layout'
import { Menu, MenuButton } from '@/shared/ui/Menu'
import { Modal } from '@/shared/ui/Modal'
import { StageForm } from '../components/StageForm'
import {
  useAddDivision,
  useAddStage,
  useDeleteDivision,
  useDeleteStage,
  useRenameDivision,
  useUpdateStage,
} from '../hooks'
import { stageFormatLabels } from '../labels'
import type { Division, Stage } from '../types'
import { useTournamentOutlet } from '../tournamentOutlet'

/** Окно дивизиона: новый (id нет) или переименование. */
type DivisionDialog = { id?: string; name: string }

/**
 * Вкладка «Этапы». Структура турнира — «дивизион → этапы»; пока дивизион один, он не показывается
 * и страница выглядит как простой список этапов. С двумя и более — по блоку на дивизион.
 */
export default function TournamentStagesPage() {
  const { tournament } = useTournamentOutlet()
  const { leagueId, id: tournamentId, stages, divisions } = tournament
  const confirm = useConfirm()

  const addStage = useAddStage(leagueId, tournamentId)
  const updateStage = useUpdateStage(leagueId, tournamentId)
  const deleteStage = useDeleteStage(leagueId, tournamentId)
  const addDivision = useAddDivision(leagueId, tournamentId)
  const renameDivision = useRenameDivision(leagueId, tournamentId)
  const deleteDivision = useDeleteDivision(leagueId, tournamentId)

  // Дивизион, в который добавляем этап; null — окно закрыто.
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [divisionDialog, setDivisionDialog] = useState<DivisionDialog | null>(null)
  const editing = stages.find((stage) => stage.id === editingId)

  const multi = divisions.length > 1
  // Этапы и дивизионы добавляются, а правила меняются только до старта турнира.
  const canAdd = tournament.status === 'Scheduled'
  const rulesLocked = tournament.status !== 'Scheduled'

  const openAddStage = (divisionId: string) => {
    addStage.reset()
    setAddingTo(divisionId)
  }

  const openDivisionDialog = (dialog: DivisionDialog) => {
    addDivision.reset()
    renameDivision.reset()
    setDivisionDialog(dialog)
  }

  const addStageButton = (division: Division, secondary = false) =>
    canAdd && (
      <button type="button" className={secondary ? 'secondary' : undefined} onClick={() => openAddStage(division.id)}>
        <Icon name="plus" size={18} />
        Новый этап
      </button>
    )

  const addDivisionButton = canAdd && (
    <button type="button" className="secondary" onClick={() => openDivisionDialog({ name: '' })}>
      <Icon name="plus" size={18} />
      Новый дивизион
    </button>
  )

  const removeStage = (stage: Stage) =>
    void confirm({
      title: `Удалить этап «${stage.name}»?`,
      message: 'Этап с матчами удалить не получится.',
      confirmLabel: 'Удалить',
      danger: true,
    }).then((ok) => {
      // Сервер откажет (409), если в этапе есть матчи.
      if (ok) deleteStage.mutate(stage.id)
    })

  const removeDivision = (division: Division) =>
    void confirm({
      title: `Удалить дивизион «${division.name}»?`,
      message: 'Вместе с ним удалятся его этапы. Дивизион с заявками команд или матчами удалить не получится.',
      confirmLabel: 'Удалить',
      danger: true,
    }).then((ok) => {
      // Сервер откажет (409), если в дивизионе есть заявки или матчи.
      if (ok) deleteDivision.mutate(division.id)
    })

  const submitDivision = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!divisionDialog) return
    const name = String(new FormData(event.currentTarget).get('name')).trim()
    const onSuccess = () => setDivisionDialog(null)
    if (divisionDialog.id) renameDivision.mutate({ divisionId: divisionDialog.id, name }, { onSuccess })
    else addDivision.mutate(name, { onSuccess })
  }

  const stageList = (division: Division) => (
    <ol className="stage-list">
      {division.stages.map((stage) => (
        <li key={stage.id} className="stage-card">
          <span className="stage-order" aria-hidden="true">
            {stage.order}
          </span>
          <div className="stage-card-body">
            <Link to={`/leagues/${leagueId}/tournaments/${tournamentId}/stages/${stage.id}`} className="stage-card-link">
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
              {stage.groups.length > 0 && <span>{plural(stage.groups.length, ['группа', 'группы', 'групп'])}</span>}
              {stage.qualifiersCount !== null && (
                <span>
                  дальше выходят {stage.qualifiersCount}
                  {stage.groups.length > 0 && ' из группы'}
                </span>
              )}
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
            <MenuButton danger disabled={deleteStage.isPending} onClick={() => removeStage(stage)}>
              Удалить
            </MenuButton>
          </Menu>
        </li>
      ))}
    </ol>
  )

  const lockedNotice = rulesLocked && (
    <p className="notice">
      Турнир уже начат: новые этапы и дивизионы добавлять нельзя, у существующих этапов меняется только название и
      число выходящих дальше.
    </p>
  )

  return (
    <>
      {multi ? (
        <>
          <div className="toolbar">
            <p className="muted">
              {plural(divisions.length, ['дивизион', 'дивизиона', 'дивизионов'])} · у каждого свои команды, таблица и
              статистика игроков
            </p>
            {addDivisionButton}
          </div>
          {lockedNotice}

          {divisions.map((division) => (
              <Card
                key={division.id}
                title={division.name}
                actions={
                  <>
                    {addStageButton(division, true)}
                    <Menu
                      triggerClassName="icon-button"
                      triggerLabel={`Действия с дивизионом «${division.name}»`}
                      trigger={<Icon name="more" />}
                      align="end"
                    >
                      <MenuButton onClick={() => openDivisionDialog({ id: division.id, name: division.name })}>
                        Переименовать
                      </MenuButton>
                      <MenuButton danger disabled={deleteDivision.isPending} onClick={() => removeDivision(division)}>
                        Удалить
                      </MenuButton>
                    </Menu>
                  </>
                }
              >
                {division.stages.length === 0 ? (
                  <p className="muted">
                    Этапов пока нет. Добавьте круговой этап — в нём заявляются команды и составляется расписание.
                  </p>
                ) : (
                  stageList(division)
                )}
              </Card>
            ))}
          <ErrorText error={deleteStage.error ?? deleteDivision.error} />
        </>
      ) : stages.length === 0 ? (
        <>
          <EmptyState icon="layers" title="Этапов пока нет" action={addStageButton(divisions[0]) || undefined}>
            Этап — это круг чемпионата, групповой этап или плей-офф. Команды заявляются в турнир, матчи играются внутри
            этапа.
            {!canAdd && ' Этапы можно добавлять только в запланированный турнир.'}
          </EmptyState>
          {canAdd && (
            <div className="toolbar">
              <p className="muted">В турнире несколько дивизионов со своими командами и таблицами?</p>
              <button type="button" className="ghost" onClick={() => openDivisionDialog({ name: '' })}>
                Разделить на дивизионы
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="toolbar">
            <p className="muted">
              {plural(stages.length, ['этап', 'этапа', 'этапов'])} · откройте этап, чтобы заявить команды и составить
              расписание
            </p>
            {addDivisionButton}
            {addStageButton(divisions[0])}
          </div>
          {lockedNotice}
          {stageList(divisions[0])}
          <ErrorText error={deleteStage.error} />
        </>
      )}

      <Modal open={addingTo !== null} onClose={() => setAddingTo(null)} title="Новый этап">
        <StageForm
          key={addingTo}
          submitLabel="Добавить этап"
          pending={addStage.isPending}
          error={addStage.error}
          onSubmit={(body) =>
            addStage.mutate({ ...body, divisionId: addingTo ?? undefined }, { onSuccess: () => setAddingTo(null) })
          }
          onCancel={() => setAddingTo(null)}
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

      <Modal
        open={divisionDialog !== null}
        onClose={() => setDivisionDialog(null)}
        title={divisionDialog?.id ? 'Переименовать дивизион' : 'Новый дивизион'}
      >
        {divisionDialog && (
          <form key={divisionDialog.id ?? 'new'} onSubmit={submitDivision}>
            <label>
              Название
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={divisionDialog.name}
                placeholder="Например, Второй дивизион"
                autoFocus
              />
            </label>
            {!divisionDialog.id && (
              <p className="hint">
                Дивизион — отдельное соревнование внутри турнира: свои команды, этапы, таблица и статистика игроков.
                Команда играет только в одном дивизионе.
                {!multi &&
                  ` Все нынешние этапы и заявки останутся в дивизионе «${divisions[0].name}» — его можно переименовать.`}
              </p>
            )}
            <ErrorText error={divisionDialog.id ? renameDivision.error : addDivision.error} />
            <div className="actions">
              <button type="submit" disabled={addDivision.isPending || renameDivision.isPending}>
                {divisionDialog.id ? 'Сохранить' : 'Добавить дивизион'}
              </button>
              <button type="button" className="secondary" onClick={() => setDivisionDialog(null)}>
                Отмена
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
