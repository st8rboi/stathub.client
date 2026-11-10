import { useState, type SubmitEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useUpdateTournament } from '../hooks'
import type { Tournament } from '../types'

export function EditTournamentForm({ tournament, onDone }: { tournament: Tournament; onDone: () => void }) {
  const update = useUpdateTournament(tournament.leagueId, tournament.id)
  // Нужна для ограничения даты окончания: она не раньше начала.
  const [startDate, setStartDate] = useState(tournament.startDate)

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)

    update.mutate(
      {
        name: String(form.get('name')),
        startDate,
        endDate: String(form.get('endDate')) || null,
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Название
        <input name="name" required maxLength={200} defaultValue={tournament.name} />
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
          <input name="endDate" type="date" min={startDate || undefined} defaultValue={tournament.endDate ?? ''} />
        </label>
      </div>
      <ErrorText error={update.error} />
      <div className="actions">
        <button type="submit" disabled={update.isPending}>
          Сохранить
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          Отмена
        </button>
      </div>
    </form>
  )
}
