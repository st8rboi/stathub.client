import { useState } from 'react'
import { Link } from 'react-router'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useDeleteStage, useUpdateStage } from '../hooks'
import { stageFormatLabels } from '../labels'
import type { Stage } from '../types'
import { StageForm } from './StageForm'

type Props = {
  leagueId: string
  tournamentId: string
  stages: Stage[]
  /** Турнир начат: у этапов можно менять только название. */
  rulesLocked: boolean
}

export function StagesTable({ leagueId, tournamentId, stages, rulesLocked }: Props) {
  const updateStage = useUpdateStage(leagueId, tournamentId)
  const deleteStage = useDeleteStage(leagueId, tournamentId)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (stages.length === 0) return <p>Этапов пока нет.</p>

  const editing = stages.find((s) => s.id === editingId)

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Название</th>
            <th>Формат</th>
            <th>Очки (В/Н/П)</th>
            <th>Матч</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.id}>
              <td>{s.order}</td>
              <td>
                <Link to={`/leagues/${leagueId}/tournaments/${tournamentId}/stages/${s.id}`}>{s.name}</Link>
              </td>
              <td>{stageFormatLabels[s.formatType]}</td>
              <td>
                {s.winPoints} / {s.drawPoints} / {s.lossPoints}
              </td>
              <td>
                {s.periodsCount} × {s.periodDurationMinutes} мин
                {s.extraTimeEnabled && ', доп. время'}
                {s.penaltyShootoutEnabled && ', пенальти'}
              </td>
              <td className="actions-cell">
                <div className="actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      updateStage.reset()
                      setEditingId(s.id)
                    }}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={deleteStage.isPending}
                    onClick={() => {
                      // Сервер откажет (409), если в этапе есть заявки или матчи.
                      if (confirm(`Удалить этап «${s.name}»?`)) {
                        deleteStage.mutate(s.id, { onSuccess: () => editingId === s.id && setEditingId(null) })
                      }
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ErrorText error={deleteStage.error} />

      {editing && (
        <>
          <h3>Этап «{editing.name}»</h3>
          <StageForm
            // key сбрасывает поля формы при переключении на другой этап
            key={editing.id}
            initial={editing}
            submitLabel="Сохранить этап"
            pending={updateStage.isPending}
            error={updateStage.error}
            rulesLocked={rulesLocked}
            onSubmit={(body) =>
              updateStage.mutate({ stageId: editing.id, body }, { onSuccess: () => setEditingId(null) })
            }
            onCancel={() => setEditingId(null)}
          />
        </>
      )}
    </>
  )
}
