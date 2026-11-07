import type { SubmitEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { stageFormatLabels } from '../labels'
import type { AddStageBody, StageFormatType } from '../types'

const defaults: AddStageBody = {
  name: '',
  formatType: 'Round',
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  periodDurationMinutes: 45,
  periodsCount: 2,
  extraTimeEnabled: false,
  penaltyShootoutEnabled: false,
}

type Props = {
  initial?: AddStageBody
  submitLabel: string
  pending: boolean
  error: unknown
  /** Правила только для чтения: турнир начат или в этапе есть матчи — менять можно лишь название. */
  rulesLocked?: boolean
  onSubmit: (body: AddStageBody, form: HTMLFormElement) => void
  onCancel?: () => void
}

// Поля этапа: общие для добавления и правки.
export function StageForm({ initial = defaults, submitLabel, pending, error, rulesLocked, onSubmit, onCancel }: Props) {
  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formElement = e.currentTarget
    const form = new FormData(formElement)

    // Заблокированные поля (disabled) в FormData не попадают — берём исходные правила.
    const rules = rulesLocked
      ? {
          formatType: initial.formatType,
          winPoints: initial.winPoints,
          drawPoints: initial.drawPoints,
          lossPoints: initial.lossPoints,
          periodDurationMinutes: initial.periodDurationMinutes,
          periodsCount: initial.periodsCount,
          extraTimeEnabled: initial.extraTimeEnabled,
          penaltyShootoutEnabled: initial.penaltyShootoutEnabled,
        }
      : {
          formatType: form.get('formatType') as StageFormatType,
          winPoints: Number(form.get('winPoints')),
          drawPoints: Number(form.get('drawPoints')),
          lossPoints: Number(form.get('lossPoints')),
          periodDurationMinutes: Number(form.get('periodDurationMinutes')),
          periodsCount: Number(form.get('periodsCount')),
          extraTimeEnabled: form.get('extraTimeEnabled') === 'on',
          penaltyShootoutEnabled: form.get('penaltyShootoutEnabled') === 'on',
        }

    onSubmit({ ...rules, name: String(form.get('name')) }, formElement)
  }

  return (
    <form onSubmit={submit}>
      <label>
        Название
        <input name="name" required maxLength={200} defaultValue={initial.name} />
      </label>
      <fieldset disabled={rulesLocked} className="plain">
        <label>
          Формат
          <select name="formatType" defaultValue={initial.formatType}>
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
            <input name="winPoints" type="number" min={0} defaultValue={initial.winPoints} required />
          </label>
          <label>
            За ничью
            <input name="drawPoints" type="number" min={0} defaultValue={initial.drawPoints} required />
          </label>
          <label>
            За поражение
            <input name="lossPoints" type="number" min={0} defaultValue={initial.lossPoints} required />
          </label>
        </div>
        <div className="row">
          <label>
            Периодов
            <input name="periodsCount" type="number" min={1} defaultValue={initial.periodsCount} required />
          </label>
          <label>
            Минут в периоде
            <input
              name="periodDurationMinutes"
              type="number"
              min={1}
              defaultValue={initial.periodDurationMinutes}
              required
            />
          </label>
        </div>
        <label className="check">
          <input name="extraTimeEnabled" type="checkbox" defaultChecked={initial.extraTimeEnabled} /> Дополнительное
          время
        </label>
        <label className="check">
          <input name="penaltyShootoutEnabled" type="checkbox" defaultChecked={initial.penaltyShootoutEnabled} /> Серия
          пенальти
        </label>
      </fieldset>
      {rulesLocked && (
        <p className="hint">Турнир уже начат — правила этапа менять нельзя, только название.</p>
      )}
      <ErrorText error={error} />
      <div className="actions">
        <button type="submit" disabled={pending}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Отмена
          </button>
        )}
      </div>
    </form>
  )
}
