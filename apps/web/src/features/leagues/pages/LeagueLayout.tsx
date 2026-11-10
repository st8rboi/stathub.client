import { Link, Outlet, useParams } from 'react-router'
import { useTournaments } from '@/features/tournaments/hooks'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Badge, Loading, LogoBadge, PageHeader, Tabs } from '@/shared/ui/layout'
import { useLeague, usePublishLeague } from '../hooks'
import { dataSourceLabels, leagueStatusLabels, leagueStatusTones } from '../labels'
import type { LeagueOutletContext } from '../leagueOutlet'

/**
 * Рамка страницы лиги: шапка (логотип, статус, публикация) и вкладки.
 * Содержимое вкладок — дочерние роуты, лига передаётся им через Outlet context.
 */
export default function LeagueLayout() {
  const { leagueId = '' } = useParams()
  const league = useLeague(leagueId)
  const tournaments = useTournaments(leagueId)
  const publish = usePublishLeague()

  if (league.error) return <ErrorText error={league.error} />
  if (!league.data) return <Loading />

  const { data } = league
  const basePath = `/leagues/${leagueId}`
  const place = [data.city, data.region].filter(Boolean).join(', ')

  return (
    <>
      <PageHeader
        media={<LogoBadge src={data.logoUrl} name={data.name} size="lg" />}
        title={data.name}
        meta={
          <>
            <Badge tone={leagueStatusTones[data.status]}>{leagueStatusLabels[data.status]}</Badge>
            {place && <span>{place}</span>}
            {data.dataSource === 'Mirrored' && <span>{dataSourceLabels.Mirrored}</span>}
          </>
        }
        actions={
          data.status === 'Draft' && (
            <button type="button" disabled={publish.isPending} onClick={() => publish.mutate(leagueId)}>
              {publish.isPending ? 'Публикуем…' : 'Опубликовать'}
            </button>
          )
        }
      />
      <ErrorText error={publish.error} />

      {data.status === 'Draft' && (
        <p className="notice">
          Черновик: лига не видна на публичной витрине.
          {!data.city && (
            <>
              {' '}
              Для публикации укажите город в <Link to={`${basePath}/settings`}>настройках</Link>.
            </>
          )}
        </p>
      )}
      {data.status === 'Archived' && (
        <p className="notice">Лига в архиве: новые турниры в ней создавать нельзя.</p>
      )}

      <Tabs
        label="Разделы лиги"
        items={[
          { to: basePath, label: 'Турниры', end: true, count: tournaments.data?.length },
          { to: `${basePath}/settings`, label: 'Настройки' },
        ]}
      />

      <Outlet context={{ league: data } satisfies LeagueOutletContext} />
    </>
  )
}
