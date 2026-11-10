import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/features/auth/authContext'
import { useOrganizer } from '@/features/organizer/organizerContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Badge, EmptyState, Loading, LogoBadge, PageHeader } from '@/shared/ui/layout'
import { Modal } from '@/shared/ui/Modal'
import { CreateLeagueForm } from '../components/CreateLeagueForm'
import { useLeagues } from '../hooks'
import { leagueStatusLabels, leagueStatusTones } from '../labels'

export default function LeaguesPage() {
  const { user } = useAuth()
  // Организация приходит из токена: пока сессии нет, запрос не отправляем.
  const { organizerId } = useOrganizer()
  const leagues = useLeagues(organizerId, Boolean(organizerId))
  const [creating, setCreating] = useState(false)

  const createButton = (
    <button type="button" onClick={() => setCreating(true)}>
      <Icon name="plus" size={18} />
      Новая лига
    </button>
  )

  return (
    <>
      <PageHeader
        title="Лиги"
        meta={user?.tenantName && <span>{user.tenantName}</span>}
        actions={leagues.data && leagues.data.length > 0 && createButton}
      />

      <ErrorText error={leagues.error} />
      {leagues.isPending && <Loading />}

      {leagues.data?.length === 0 && (
        <EmptyState icon="trophy" title="Лиг пока нет" action={createButton}>
          Лига — ваша площадка на витрине: у неё свой адрес и логотип, внутри проводятся турниры.
        </EmptyState>
      )}

      {leagues.data && leagues.data.length > 0 && (
        <ul className="entity-grid">
          {leagues.data.map((league) => (
            <li key={league.id}>
              <Link to={`/leagues/${league.id}`} className="entity-card">
                <LogoBadge src={league.logoUrl} name={league.name} />
                <span className="entity-card-body">
                  <span className="entity-card-title">{league.name}</span>
                  <span className="entity-card-meta">
                    <Badge tone={leagueStatusTones[league.status]}>{leagueStatusLabels[league.status]}</Badge>
                    {league.city && <span>{league.city}</span>}
                  </span>
                </span>
                <Icon name="chevron-right" className="entity-card-chevron" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Новая лига">
        <CreateLeagueForm onCancel={() => setCreating(false)} />
      </Modal>
    </>
  )
}
