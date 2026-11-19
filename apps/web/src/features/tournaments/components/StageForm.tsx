import { useState, type SubmitEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { stageFormatLabels } from '../labels'
import type { StageBody, StageFormatType } from '../types'

const defaults: StageBody = {
  name: '',
  formatType: 'Round',
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  periodDurationMinutes: 45,
  periodsCount: 2,
  extraTimeEnabled: false,
  penaltyShootoutEnabled: false,
  bonusGoalEnabled: false,
  qualifiersCount: null,
  eliminatedCount: null,
}

type Props = {
  initial?: StageBody
  submitLabel: string
  pending: boolean
  error: unknown
  /** Правила только для чтения: турнир начат или в этапе есть матчи — менять можно лишь название и зоны таблицы. */
  rulesLocked?: boolean
  onSubmit: (body: StageBody, form: HTMLFormElement) => void
  onCancel?: () => void
}

// Поля этапа: общие для добавления и правки.
export function StageForm({ initial = defaults, submitLabel, pending, error, rulesLocked, onSubmit, onCancel }: Props) {
  // Формат влияет на состав полей: зоны выхода и вылета задаются только у кругового этапа.
  const [formatType, setFormatType] = useState<StageFormatType>(initial.formatType)

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
          bonusGoalEnabled: initial.bonusGoalEnabled,
        }
      : {
          formatType,
          winPoints: Number(form.get('winPoints')),
          drawPoints: Number(form.get('drawPoints')),
          lossPoints: Number(form.get('lossPoints')),
          periodDurationMinutes: Number(form.get('periodDurationMinutes')),
          periodsCount: Number(form.get('periodsCount')),
          extraTimeEnabled: form.get('extraTimeEnabled') === 'on',
          penaltyShootoutEnabled: form.get('penaltyShootoutEnabled') === 'on',
          bonusGoalEnabled: form.get('bonusGoalEnabled') === 'on',
        }

    // Пустое поле — зоны нет. У плей-офф этих полей нет вовсе.
    const zone = (field: string) => {
      const raw = String(form.get(field) ?? '').trim()
      return rules.formatType === 'Round' && raw ? Number(raw) : null
    }

    onSubmit(
      {
        ...rules,
        name: String(form.get('name')).trim(),
        qualifiersCount: zone('qualifiersCount'),
        eliminatedCount: zone('eliminatedCount'),
      },
      formElement,
    )
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
          <select
            name="formatType"
            value={formatType}
            onChange={(event) => setFormatType(event.target.value as StageFormatType)}
          >
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
            Таймов
            <input name="periodsCount" type="number" min={1} defaultValue={initial.periodsCount} required />
          </label>
          <label>
            Минут в тайме
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
        <label className="check">
          <input name="bonusGoalEnabled" type="checkbox" defaultChecked={initial.bonusGoalEnabled} /> Бонусный мяч
          (гол за два)
        </label>
      </fieldset>
      {formatType === 'Round' && (
        <label>
          Выходят в следующий этап
          <input
            name="qualifiersCount"
            type="number"
            min={1}
            placeholder="никто"
            defaultValue={initial.qualifiersCount ?? ''}
          />
          <span className="hint">
            Сколько первых команд таблицы проходит дальше, например в плей-офф. Если в этапе есть группы — столько из
            каждой группы. Оставьте пустым для обычного чемпионата.
          </span>
        </label>
      )}
      {formatType === 'Round' && (
        <label>
          Вылетают
          <input
            name="eliminatedCount"
            type="number"
            min={1}
            placeholder="никто"
            defaultValue={initial.eliminatedCount ?? ''}
          />
          <span className="hint">
            Сколько последних команд таблицы выбывает. Если в этапе есть группы — столько из каждой группы. Оставьте
            пустым, если никто не вылетает.
          </span>
        </label>
      )}
      {rulesLocked && (
        <p className="hint">
          Турнир уже начат — правила этапа менять нельзя, только название и число выходящих дальше и вылетающих.
        </p>
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
