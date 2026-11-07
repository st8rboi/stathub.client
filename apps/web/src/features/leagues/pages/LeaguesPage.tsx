import { Link } from 'react-router'
import { useOrganizer } from '@/features/organizer/organizerContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { CreateLeagueForm } from '../components/CreateLeagueForm'
import { useLeagues } from '../hooks'
import { leagueStatusLabels } from '../labels'

export default function LeaguesPage() {
  // Организация приходит из токена: пока сессии нет, запрос не отправляем.
  const { organizerId } = useOrganizer()
  const leagues = useLeagues(organizerId, Boolean(organizerId))

  return (
    <>
      <h1>Мои лиги</h1>

      <ErrorText error={leagues.error} />
      {leagues.isPending && <p>Загрузка…</p>}
      {leagues.data?.length === 0 && <p>Лиг пока нет — создайте первую ниже.</p>}
      {leagues.data && leagues.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>Slug</th>
              <th>Город</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {leagues.data.map((league) => (
              <tr key={league.id}>
                <td>
                  <Link to={`/leagues/${league.id}`}>{league.name}</Link>
                </td>
                <td>{league.slug}</td>
                <td>{league.city ?? '—'}</td>
                <td>{leagueStatusLabels[league.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Новая лига</h2>
      <CreateLeagueForm />
    </>
  )
}
