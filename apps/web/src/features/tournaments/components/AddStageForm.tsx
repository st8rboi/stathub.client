import type { SubmitEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useAddStage } from '../hooks'
import { stageFormatLabels } from '../labels'
import type { StageFormatType } from '../types'

export function AddStageForm({ leagueId, tournamentId }: { leagueId: string; tournamentId: string }) {
  const addStage = useAddStage(leagueId, tournamentId)

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formElement = e.currentTarget
    const form = new FormData(formElement)
    addStage.mutate(
      {
        name: String(form.get('name')),
        formatType: form.get('formatType') as StageFormatType,
        winPoints: Number(form.get('winPoints')),
        drawPoints: Number(form.get('drawPoints')),
        lossPoints: Number(form.get('lossPoints')),
        periodDurationMinutes: Number(form.get('periodDurationMinutes')),
        periodsCount: Number(form.get('periodsCount')),
        extraTimeEnabled: form.get('extraTimeEnabled') === 'on',
        penaltyShootoutEnabled: form.get('penaltyShootoutEnabled') === 'on',
      },
      { onSuccess: () => formElement.reset() },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Название
        <input name="name" required maxLength={200} />
      </label>
      <label>
        Формат
        <select name="formatType" defaultValue="Round">
          {Object.entries(stageFormatLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="row">
        <label>
          Очки за победу
          <input name="winPoints" type="number" min={0} defaultValue={3} required />
        </label>
        <label>
          За ничью
          <input name="drawPoints" type="number" min={0} defaultValue={1} required />
        </label>
        <label>
          За поражение
          <input name="lossPoints" type="number" min={0} defaultValue={0} required />
        </label>
      </div>
      <div className="row">
        <label>
          Периодов
          <input name="periodsCount" type="number" min={1} defaultValue={2} required />
        </label>
        <label>
          Минут в периоде
          <input name="periodDurationMinutes" type="number" min={1} defaultValue={45} required />
        </label>
      </div>
      <label className="check">
        <input name="extraTimeEnabled" type="checkbox" /> Дополнительное время
      </label>
      <label className="check">
        <input name="penaltyShootoutEnabled" type="checkbox" /> Серия пенальти
      </label>
      <ErrorText error={addStage.error} />
      <button type="submit" disabled={addStage.isPending}>
        Добавить этап
      </button>
    </form>
  )
}
