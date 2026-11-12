import type { ReactNode } from 'react'
import { Link, useMatch } from 'react-router'
import { useLeague, useLeagues } from '@/features/leagues/hooks'
import { leagueStatusLabels } from '@/features/leagues/labels'
import { useOrganizer } from '@/features/organizer/organizerContext'
import { useTournamentTeams } from '@/features/rosters/hooks'
import { tournamentTeamStatusLabels } from '@/features/rosters/labels'
import { useTeamsByIds } from '@/features/teams/hooks'
import { useTournament, useTournaments } from '@/features/tournaments/hooks'
import { stageDisplayName, stageFormatLabels, tournamentStatusLabels } from '@/features/tournaments/labels'
import { Icon } from '@/shared/ui/Icon'
import { Menu, MenuEmpty, MenuLink, MenuTitle } from '@/shared/ui/Menu'

const leaguePath = (leagueId: string) => `/leagues/${leagueId}`
const tournamentPath = (leagueId: string, tournamentId: string) =>
  `${leaguePath(leagueId)}/tournaments/${tournamentId}`
const stagePath = (leagueId: string, tournamentId: string, stageId: string) =>
  `${tournamentPath(leagueId, tournamentId)}/stages/${stageId}`
const teamPath = (leagueId: string, tournamentId: string, stageId: string, tournamentTeamId: string) =>
  `${stagePath(leagueId, tournamentId, stageId)}/teams/${tournamentTeamId}`

/**
 * Хлебные крошки соревнования: Лиги / Лига ▾ / Турнир ▾ / Этап ▾ / Команда ▾.
 * У каждого уровня есть переключатель на соседей — можно перейти в другой этап
 * или турнир, не поднимаясь наверх. Вне раздела соревнований крошек нет.
 *
 * Параметры берём сопоставлением адреса, а не из useParams: каркас стоит выше
 * страниц в дереве роутов и не должен зависеть от их структуры.
 */
export function Breadcrumbs() {
  const leagueMatch = useMatch('/leagues/:leagueId/*')
  const tournamentMatch = useMatch('/leagues/:leagueId/tournaments/:tournamentId/*')
  const stageMatch = useMatch('/leagues/:leagueId/tournaments/:tournamentId/stages/:stageId/*')
  const teamMatch = useMatch('/leagues/:leagueId/tournaments/:tournamentId/stages/:stageId/teams/:tournamentTeamId/*')

  const leagueId = leagueMatch?.params.leagueId
  if (!leagueId) return null

  const tournamentId = tournamentMatch?.params.tournamentId
  const stageId = stageMatch?.params.stageId
  const tournamentTeamId = teamMatch?.params.tournamentTeamId

  return (
    <nav className="crumbs" aria-label="Путь по соревнованию">
      <ol>
        <li className="crumb">
          <Link to="/" className="crumb-link">
            Лиги
          </Link>
        </li>
        <LeagueCrumb leagueId={leagueId} current={!tournamentId} />
        {tournamentId && (
          <TournamentCrumb leagueId={leagueId} tournamentId={tournamentId} current={!stageId} />
        )}
        {tournamentId && stageId && (
          <StageCrumb leagueId={leagueId} tournamentId={tournamentId} stageId={stageId} current={!tournamentTeamId} />
        )}
        {tournamentId && stageId && tournamentTeamId && (
          <TeamCrumb
            leagueId={leagueId}
            tournamentId={tournamentId}
            stageId={stageId}
            tournamentTeamId={tournamentTeamId}
          />
        )}
      </ol>
    </nav>
  )
}

interface CrumbProps {
  label: string
  /** Ссылка на уровень; у текущего уровня её нет — название само открывает переключатель. */
  to: string
  current: boolean
  /** Подпись для скринридера: «Выбрать турнир» и т. п. */
  switchLabel: string
  /** Пункты переключателя. */
  menu: ReactNode
}

function Crumb({ label, to, current, switchLabel, menu }: CrumbProps) {
  if (current) {
    return (
      <li className="crumb" aria-current="page">
        <Menu
          triggerClassName="crumb-current"
          triggerLabel={`${label}. ${switchLabel}`}
          trigger={
            <>
              <span className="crumb-current-label">{label}</span>
              <Icon name="chevron-down" size={16} />
            </>
          }
        >
          {menu}
        </Menu>
      </li>
    )
  }

  return (
    <li className="crumb">
      <Link to={to} className="crumb-link" title={label}>
        {label}
      </Link>
      <Menu triggerClassName="crumb-toggle" triggerLabel={switchLabel} trigger={<Icon name="chevron-down" size={16} />}>
        {menu}
      </Menu>
    </li>
  )
}

function LeagueCrumb({ leagueId, current }: { leagueId: string; current: boolean }) {
  const { organizerId } = useOrganizer()
  const leagues = useLeagues(organizerId, Boolean(organizerId))
  const league = useLeague(leagueId)

  return (
    <Crumb
      label={league.data?.name ?? '…'}
      to={leaguePath(leagueId)}
      current={current}
      switchLabel="Выбрать лигу"
      menu={
        <>
          <MenuTitle>Лиги</MenuTitle>
          {leagues.data?.map((item) => (
            <MenuLink
              key={item.id}
              to={leaguePath(item.id)}
              label={item.name}
              hint={[leagueStatusLabels[item.status], item.city].filter(Boolean).join(' · ')}
              current={item.id === leagueId}
            />
          ))}
          {leagues.data?.length === 0 && <MenuEmpty>Лиг нет</MenuEmpty>}
        </>
      }
    />
  )
}

function TournamentCrumb({
  leagueId,
  tournamentId,
  current,
}: {
  leagueId: string
  tournamentId: string
  current: boolean
}) {
  const tournaments = useTournaments(leagueId)
  const tournament = useTournament(leagueId, tournamentId)

  return (
    <Crumb
      label={tournament.data?.name ?? '…'}
      to={tournamentPath(leagueId, tournamentId)}
      current={current}
      switchLabel="Выбрать турнир"
      menu={
        <>
          <MenuTitle>Турниры лиги</MenuTitle>
          {tournaments.data?.map((item) => (
            <MenuLink
              key={item.id}
              to={tournamentPath(leagueId, item.id)}
              label={item.name}
              hint={tournamentStatusLabels[item.status]}
              current={item.id === tournamentId}
            />
          ))}
          {tournaments.data?.length === 0 && <MenuEmpty>Турниров нет</MenuEmpty>}
        </>
      }
    />
  )
}

function StageCrumb({
  leagueId,
  tournamentId,
  stageId,
  current,
}: {
  leagueId: string
  tournamentId: string
  stageId: string
  current: boolean
}) {
  const tournament = useTournament(leagueId, tournamentId)
  const stages = tournament.data?.stages ?? []
  const stage = stages.find((item) => item.id === stageId)

  return (
    <Crumb
      label={tournament.data && stage ? stageDisplayName(tournament.data, stage) : '…'}
      to={stagePath(leagueId, tournamentId, stageId)}
      current={current}
      switchLabel="Выбрать этап"
      menu={
        <>
          <MenuTitle>Этапы турнира</MenuTitle>
          {stages.map((item) => (
            <MenuLink
              key={item.id}
              to={stagePath(leagueId, tournamentId, item.id)}
              label={tournament.data ? stageDisplayName(tournament.data, item) : item.name}
              hint={stageFormatLabels[item.formatType]}
              current={item.id === stageId}
            />
          ))}
          {tournament.data && stages.length === 0 && <MenuEmpty>Этапов нет</MenuEmpty>}
        </>
      }
    />
  )
}

function TeamCrumb({
  leagueId,
  tournamentId,
  stageId,
  tournamentTeamId,
}: {
  leagueId: string
  tournamentId: string
  stageId: string
  tournamentTeamId: string
}) {
  const tournamentTeams = useTournamentTeams(stageId)
  const allTeams = useTeamsByIds((tournamentTeams.data ?? []).map((item) => item.teamId))

  const teamName = (teamId: string) => allTeams.data?.find((team) => team.id === teamId)?.name ?? '…'
  const current = tournamentTeams.data?.find((item) => item.id === tournamentTeamId)

  return (
    <Crumb
      label={current ? teamName(current.teamId) : '…'}
      to={teamPath(leagueId, tournamentId, stageId, tournamentTeamId)}
      current
      switchLabel="Выбрать команду"
      menu={
        <>
          <MenuTitle>Команды</MenuTitle>
          {tournamentTeams.data?.map((item) => (
            <MenuLink
              key={item.id}
              to={teamPath(leagueId, tournamentId, stageId, item.id)}
              label={teamName(item.teamId)}
              hint={tournamentTeamStatusLabels[item.status]}
              current={item.id === tournamentTeamId}
            />
          ))}
          {tournamentTeams.data?.length === 0 && <MenuEmpty>Команд нет</MenuEmpty>}
        </>
      }
    />
  )
}
