import type { SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useCreateTournament, useTournaments } from '../hooks'
import { tournamentStatusLabels } from '../labels'

// Список турниров лиги + форма создания (используется на странице лиги)
export function TournamentsSection({ leagueId, canCreate }: { leagueId: string; canCreate: boolean }) {
  const navigate = useNavigate()
  const tournaments = useTournaments(leagueId)
  const create = useCreateTournament(leagueId)

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    create.mutate(
      {
        name: String(form.get('name')),
        startDate: String(form.get('startDate')),
        endDate: String(form.get('endDate')) || null,
      },
      { onSuccess: ({ id }) => void navigate(`/leagues/${leagueId}/tournaments/${id}`) },
    )
  }

  return (
    <>
      <h2>Турниры</h2>
      <ErrorText error={tournaments.error} />
      {tournaments.data?.length === 0 && <p>Турниров пока нет.</p>}
      {tournaments.data && tournaments.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>Начало</th>
              <th>Окончание</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.data.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link to={`/leagues/${leagueId}/tournaments/${t.id}`}>{t.name}</Link>
                </td>
                <td>{t.startDate}</td>
                <td>{t.endDate ?? '—'}</td>
                <td>{tournamentStatusLabels[t.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canCreate && (
        <>
          <h2>Новый турнир</h2>
          <form onSubmit={onSubmit}>
            <label>
              Название
              <input name="name" required maxLength={200} />
            </label>
            <label>
              Дата начала
              <input name="startDate" type="date" required />
            </label>
            <label>
              Дата окончания (необязательно)
              <input name="endDate" type="date" />
            </label>
            <ErrorText error={create.error} />
            <button type="submit" disabled={create.isPending}>
              Создать турнир
            </button>
          </form>
        </>
      )}
    </>
  )
}
