import { useState, type SubmitEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'

export interface MatchFormValues {
  homeTeamId: string
  awayTeamId: string
  /** Значение datetime-local (местное время). */
  start: string
}

interface MatchFormProps {
  /** Команды на выбор: участники этапа (+ текущие команды матча, если их сняли). */
  teams: { id: string; name: string }[]
  initial: MatchFormValues
  submitLabel: string
  pending: boolean
  error: unknown
  /** `again` — нажата «Создать и ещё»: форму не закрывать, а подготовить следующий матч. */
  onSubmit: (values: MatchFormValues, again: boolean) => void
  onCancel: () => void
  /** Показывать кнопку «Создать и ещё» (только при создании). */
  allowAgain?: boolean
  /** Сообщение над кнопками (например, «Матч создан»). */
  notice?: string | null
}

/** Форма матча: хозяева, гости, время начала. Общая для создания и правки. */
export function MatchForm({
  teams,
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
  allowAgain = false,
  notice,
}: MatchFormProps) {
  const [values, setValues] = useState(initial)
  const [formError, setFormError] = useState<string | null>(null)

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submitter = (event.nativeEvent as globalThis.SubmitEvent).submitter

    if (!values.homeTeamId || !values.awayTeamId) {
      setFormError('Выберите обе команды.')
      return
    }
    if (values.homeTeamId === values.awayTeamId) {
      setFormError('Команды должны быть разными.')
      return
    }
    if (!values.start) {
      setFormError('Укажите дату и время начала.')
      return
    }

    setFormError(null)
    onSubmit(values, submitter?.getAttribute('value') === 'again')
  }

  const teamSelect = (field: 'homeTeamId' | 'awayTeamId', label: string) => (
    <label>
      {label}
      <select
        value={values[field]}
        onChange={(event) => setValues({ ...values, [field]: event.target.value })}
        required
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
  )

  return (
    <form onSubmit={submit}>
      <div className="swap-row">
        {teamSelect('homeTeamId', 'Хозяева')}
        <button
          type="button"
          className="icon-button"
          aria-label="Поменять команды местами"
          title="Поменять местами"
          onClick={() => setValues({ ...values, homeTeamId: values.awayTeamId, awayTeamId: values.homeTeamId })}
        >
          ⇄
        </button>
        {teamSelect('awayTeamId', 'Гости')}
      </div>

      <label>
        Начало (местное время)
        <input
          type="datetime-local"
          required
          value={values.start}
          onChange={(event) => setValues({ ...values, start: event.target.value })}
        />
      </label>

      <p className="hint">Регламент (периоды, доп. время, пенальти) сервер берёт из правил этапа при создании матча.</p>

      {formError && <p className="error">{formError}</p>}
      <ErrorText error={error} />
      {notice && <p className="success-text">{notice}</p>}

      <div className="actions">
        <button type="submit" value="once" disabled={pending}>
          {submitLabel}
        </button>
        {allowAgain && (
          <button type="submit" value="again" className="secondary" disabled={pending}>
            Создать и ещё
          </button>
        )}
        <button type="button" className="ghost" onClick={onCancel}>
          {allowAgain ? 'Закрыть' : 'Отмена'}
        </button>
      </div>
    </form>
  )
}
