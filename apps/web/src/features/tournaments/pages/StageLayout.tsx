import { Link, Outlet, useParams } from 'react-router'
import { useStageMatches } from '@/features/matches/hooks'
import { useTournamentTeams } from '@/features/rosters/hooks'
import { ErrorText } from '@/shared/ui/ErrorText'
import { EmptyState, Loading, PageHeader, Tabs } from '@/shared/ui/layout'
import { useTournament } from '../hooks'
import { stageFormatLabels } from '../labels'
import type { StageOutletContext } from '../stageOutlet'

/**
 * Рамка страницы этапа — основного рабочего экрана: матчи, участники, взносы, настройки.
 * Этап берём из карточки турнира (отдельного запроса этапа нет).
 */
export default function StageLayout() {
  const { leagueId = '', tournamentId = '', stageId = '' } = useParams()
  const tournament = useTournament(leagueId, tournamentId)
  const matches = useStageMatches(stageId)
  const teams = useTournamentTeams(stageId)

  if (tournament.error) return <ErrorText error={tournament.error} />
  if (!tournament.data) return <Loading />

  const tournamentPath = `/leagues/${leagueId}/tournaments/${tournamentId}`
  const stage = tournament.data.stages.find((item) => item.id === stageId)

  if (!stage) {
    return (
      <EmptyState title="Этап не найден" action={<Link to={tournamentPath}>Вернуться к турниру</Link>}>
        Возможно, этап удалили.
      </EmptyState>
    )
  }

  const basePath = `${tournamentPath}/stages/${stageId}`
  const activeTeams = teams.data?.filter((team) => team.status === 'Active').length

  return (
    <>
      <PageHeader
        eyebrow={`Этап ${stage.order} · ${tournament.data.name}`}
        title={stage.name}
        meta={
          <>
            <span>{stageFormatLabels[stage.formatType]}</span>
            <span>
              {stage.periodsCount} × {stage.periodDurationMinutes} мин
            </span>
          </>
        }
      />

      <Tabs
        label="Разделы этапа"
        items={[
          { to: basePath, label: 'Матчи', end: true, count: matches.data?.length },
          { to: `${basePath}/teams`, label: 'Участники', end: true, count: activeTeams },
          { to: `${basePath}/fees`, label: 'Взносы' },
          { to: `${basePath}/settings`, label: 'Настройки' },
        ]}
      />

      <Outlet context={{ tournament: tournament.data, stage, basePath } satisfies StageOutletContext} />
    </>
  )
}
