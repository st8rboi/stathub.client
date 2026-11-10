import { useState, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useCreateTournament } from '../hooks'

/** Создание турнира лиги (в модальном окне). После создания открывается страница турнира. */
export function CreateTournamentForm({ leagueId, onCancel }: { leagueId: string; onCancel: () => void }) {
  const navigate = useNavigate()
  const create = useCreateTournament(leagueId)
  // Нужна для ограничения даты окончания: она не раньше начала.
  const [startDate, setStartDate] = useState('')

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    create.mutate(
      {
        name: String(form.get('name')).trim(),
        startDate,
        endDate: String(form.get('endDate')) || null,
      },
      { onSuccess: ({ id }) => void navigate(`/leagues/${leagueId}/tournaments/${id}`) },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Название
        <input name="name" required maxLength={200} autoFocus placeholder="например, Сезон 2026" />
      </label>
      <div className="row">
        <label>
          Дата начала
          <input
            name="startDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          Дата окончания
          <input name="endDate" type="date" min={startDate || undefined} />
        </label>
      </div>
      <p className="hint">Дату окончания можно указать позже. Этапы (группы, дивизионы, плей-офф) добавляются в самом турнире.</p>
      <ErrorText error={create.error} />
      <div className="actions">
        <button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Создаём…' : 'Создать турнир'}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  )
}
