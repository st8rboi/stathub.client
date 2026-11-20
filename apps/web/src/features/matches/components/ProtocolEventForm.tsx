import { useState, type SubmitEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import type { ProtocolChoice } from '../protocol'

const choiceLabels: Record<ProtocolChoice, string> = {
  Goal: 'Гол с игры',
  PenaltyGoal: 'Гол с пенальти',
  BonusGoal: 'Бонусный гол',
  OwnGoal: 'Автогол',
  PenaltyMissed: 'Пенальти не забит',
  YellowCard: 'Жёлтая карточка',
  RedCard: 'Красная карточка',
  Substitution: 'Замена',
}

export interface ProtocolEventValues {
  choice: ProtocolChoice
  teamId: string
  playerId: string
  /** Ассистент гола или выходящий на замену. */
  relatedPlayerId: string
  period: number
  minute: number
  comment: string
}

export interface RosterOption {
  id: string
  name: string
  /** Игрок отзаявлен или перешёл — в списке, но с пометкой. */
  inactive: boolean
}

interface ProtocolEventFormProps {
  teams: { id: string; name: string }[]
  /** Состав команды по её Id (с историей заявок). */
  rosterOf: (teamId: string) => RosterOption[]
  periods: number
  bonusGoalEnabled: boolean
  initial: ProtocolEventValues
  pending: boolean
  error: unknown
  /** Отказ сервера по самому событию (например, нарушено правило протокола). */
  rejection: string | null
  onSubmit: (values: ProtocolEventValues) => void
  onCancel: () => void
}

/** Форма события протокола для организатора: что, чья команда, кто, на какой минуте. */
export function ProtocolEventForm({
  teams,
  rosterOf,
  periods,
  bonusGoalEnabled,
  initial,
  pending,
  error,
  rejection,
  onSubmit,
  onCancel,
}: ProtocolEventFormProps) {
  const [values, setValues] = useState(initial)
  const [formError, setFormError] = useState<string | null>(null)

  const hasSecondPlayer = values.choice === 'Goal' || values.choice === 'BonusGoal' || values.choice === 'Substitution'
  const roster = values.teamId ? rosterOf(values.teamId) : []
  const choices = (Object.keys(choiceLabels) as ProtocolChoice[]).filter(
    (choice) => choice !== 'BonusGoal' || bonusGoalEnabled,
  )

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!values.teamId) {
      setFormError('Выберите команду.')
      return
    }
    if (hasSecondPlayer && values.playerId && values.playerId === values.relatedPlayerId) {
      setFormError(values.choice === 'Substitution' ? 'Игрок не может заменить сам себя.' : 'Ассистент не может быть автором гола.')
      return
    }
    if (!Number.isInteger(values.minute) || values.minute < 1 || values.minute > 300) {
      setFormError('Минута — целое число от 1.')
      return
    }

    setFormError(null)
    onSubmit({ ...values, relatedPlayerId: hasSecondPlayer ? values.relatedPlayerId : '' })
  }

  const playerSelect = (field: 'playerId' | 'relatedPlayerId', label: string, emptyLabel: string) => (
    <label>
      {label}
      <select value={values[field]} onChange={(event) => setValues({ ...values, [field]: event.target.value })}>
        <option value="">{emptyLabel}</option>
        {roster.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
            {player.inactive ? ' (не в составе)' : ''}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <form onSubmit={submit}>
      <label>
        Событие
        <select
          value={values.choice}
          onChange={(event) => setValues({ ...values, choice: event.target.value as ProtocolChoice })}
        >
          {choices.map((choice) => (
            <option key={choice} value={choice}>
              {choiceLabels[choice]}
            </option>
          ))}
        </select>
      </label>

      <label>
        {values.choice === 'OwnGoal' ? 'Команда игрока, забившего в свои ворота' : 'Команда'}
        <select
          value={values.teamId}
          required
          onChange={(event) => setValues({ ...values, teamId: event.target.value, playerId: '', relatedPlayerId: '' })}
        >
          <option value="" disabled>
            Выберите команду
          </option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      {playerSelect(
        'playerId',
        values.choice === 'Substitution' ? 'Уходит' : values.choice === 'PenaltyMissed' ? 'Бьющий' : 'Игрок',
        'Не указан',
      )}
      {hasSecondPlayer &&
        playerSelect('relatedPlayerId', values.choice === 'Substitution' ? 'Выходит' : 'Ассистент', 'Нет')}

      <div className="swap-row">
        <label>
          Тайм
          <select value={values.period} onChange={(event) => setValues({ ...values, period: Number(event.target.value) })}>
            {Array.from({ length: periods }, (_, index) => index + 1).map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
        </label>
        <label>
          Минута тайма
          <input
            type="number"
            min={1}
            max={300}
            required
            value={Number.isNaN(values.minute) ? '' : values.minute}
            onChange={(event) => setValues({ ...values, minute: event.target.valueAsNumber })}
          />
        </label>
      </div>

      <label>
        Комментарий
        <input
          value={values.comment}
          maxLength={512}
          placeholder="Например: гол не внесли на поле"
          onChange={(event) => setValues({ ...values, comment: event.target.value })}
        />
      </label>

      <p className="hint">
        Минута отсчитывается от начала тайма без пауз — так же, как в протоколе судьи. Игрок не из состава будет
        принят с пометкой «на разборе».
      </p>

      {formError && <p className="error">{formError}</p>}
      {rejection && <p className="error">Сервер не принял событие: {rejection}</p>}
      <ErrorText error={error} />

      <div className="actions">
        <button type="submit" disabled={pending}>
          Добавить в протокол
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  )
}
