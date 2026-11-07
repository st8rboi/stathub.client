import type { SubmitEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useUpdateTournament } from '../hooks'
import type { Tournament } from '../types'

export function EditTournamentForm({ tournament, onDone }: { tournament: Tournament; onDone: () => void }) {
  const update = useUpdateTournament(tournament.leagueId, tournament.id)

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)

    update.mutate(
      {
        name: String(form.get('name')),
        startDate: String(form.get('startDate')),
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
      <label>
        Дата начала
        <input name="startDate" type="date" required defaultValue={tournament.startDate} />
      </label>
      <label>
        Дата окончания (необязательно)
        <input name="endDate" type="date" defaultValue={tournament.endDate ?? ''} />
      </label>
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
