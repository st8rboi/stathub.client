import { useState } from 'react'
import { Link } from 'react-router'
import { useTeamsByIds } from '@/features/teams/hooks'
import { plural } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Badge, EmptyState, Loading, LogoBadge } from '@/shared/ui/layout'
import { Modal } from '@/shared/ui/Modal'
import { useTournamentTeams } from '../hooks'
import { tournamentTeamStatusLabels } from '../labels'
import { RegisterTeamsForm } from './RegisterTeamsForm'

/**
 * Участники этапа (дивизиона). Команда из справочника заявляется на конкретный этап,
 * дальше её состав живёт на отдельной странице. Одна команда может играть в разных
 * этапах одного турнира — это разные заявки.
 */
export function TournamentTeamsSection({ stageId, basePath }: { stageId: string; basePath: string }) {
  const teams = useTournamentTeams(stageId)
  const allTeams = useTeamsByIds((teams.data ?? []).map((team) => team.teamId))
  const [adding, setAdding] = useState(false)

  const teamById = (teamId: string) => allTeams.data?.find((team) => team.id === teamId)
  const list = [...(teams.data ?? [])].sort(
    (a, b) =>
      Number(a.status === 'Withdrawn') - Number(b.status === 'Withdrawn') ||
      (teamById(a.teamId)?.name ?? '').localeCompare(teamById(b.teamId)?.name ?? '', 'ru'),
  )
  const activeCount = list.filter((team) => team.status === 'Active').length

  const addButton = (
    <button type="button" onClick={() => setAdding(true)}>
      <Icon name="plus" size={18} />
      Заявить команды
    </button>
  )

  return (
    <>
      <ErrorText error={teams.error} />
      {teams.isPending && <Loading />}

      {teams.data?.length === 0 && (
        <EmptyState icon="shield" title="На этапе пока нет команд" action={addButton}>
          Заявите команды из справочника — после этого можно заявить игроков и составить расписание матчей.
        </EmptyState>
      )}

      {list.length > 0 && (
        <>
          <div className="toolbar">
            <p className="muted">{plural(activeCount, ['команда участвует', 'команды участвуют', 'команд участвуют'])}</p>
            {addButton}
          </div>

          <ul className="entity-grid">
            {list.map((tournamentTeam) => {
              const team = teamById(tournamentTeam.teamId)
              const name = team?.name ?? '…'
              const withdrawn = tournamentTeam.status === 'Withdrawn'
              return (
                <li key={tournamentTeam.id}>
                  <Link
                    to={`${basePath}/teams/${tournamentTeam.id}`}
                    className={withdrawn ? 'entity-card entity-card--muted' : 'entity-card'}
                  >
                    <LogoBadge src={team?.logoUrl ?? null} name={name} />
                    <span className="entity-card-body">
                      <span className="entity-card-title">{name}</span>
                      <span className="entity-card-meta">
                        {withdrawn && <Badge tone="danger">{tournamentTeamStatusLabels.Withdrawn}</Badge>}
                        {tournamentTeam.activePlayers > 0 ? (
                          <span>{plural(tournamentTeam.activePlayers, ['игрок', 'игрока', 'игроков'])} в заявке</span>
                        ) : (
                          !withdrawn && <span className="error-text">Состав не заявлен</span>
                        )}
                      </span>
                    </span>
                    <Icon name="chevron-right" className="entity-card-chevron" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Заявить команды на этап">
        <RegisterTeamsForm
          stageId={stageId}
          registeredTeamIds={new Set(list.map((team) => team.teamId))}
          onDone={() => setAdding(false)}
        />
      </Modal>
    </>
  )
}
