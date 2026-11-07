import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import { useTeams } from '@/features/teams/hooks'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useAddTournamentTeam, useTournamentTeams } from '../hooks'
import { tournamentTeamStatusLabels } from '../labels'

/**
 * Участники этапа (дивизиона). Команда из справочника заявляется на конкретный этап,
 * дальше её состав живёт на отдельной странице. Одна команда может играть в разных
 * дивизионах одного турнира — это разные заявки.
 */
export function TournamentTeamsSection({
  leagueId,
  tournamentId,
  stageId,
}: {
  leagueId: string
  tournamentId: string
  stageId: string
}) {
  const teams = useTournamentTeams(stageId)
  const allTeams = useTeams()
  const addTeam = useAddTournamentTeam(stageId)

  const [formError, setFormError] = useState<string | null>(null)

  const teamName = (teamId: string) =>
    allTeams.data?.find((team) => team.id === teamId)?.name ?? teamId.slice(0, 8)

  const registeredTeamIds = new Set((teams.data ?? []).map((team) => team.teamId))
  const availableTeams = (allTeams.data ?? []).filter((team) => !registeredTeamIds.has(team.id))

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formElement = e.currentTarget
    const teamId = String(new FormData(formElement).get('teamId') ?? '')

    if (!teamId) {
      setFormError('Выберите команду.')
      return
    }

    setFormError(null)
    addTeam.mutate(teamId, { onSuccess: () => formElement.reset() })
  }

  const rosterLink = (tournamentTeamId: string) =>
    `/leagues/${leagueId}/tournaments/${tournamentId}/stages/${stageId}/teams/${tournamentTeamId}`

  return (
    <>
      <ErrorText error={teams.error} />
      {teams.isPending && <p>Загрузка…</p>}
      {teams.data?.length === 0 && (
        <p className="notice">На этом этапе пока нет команд — заявите первую ниже.</p>
      )}
      {teams.data && teams.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Команда</th>
              <th>Статус</th>
              <th>Игроков в заявке</th>
              <th>Состав</th>
            </tr>
          </thead>
          <tbody>
            {teams.data.map((tournamentTeam) => (
              <tr key={tournamentTeam.id}>
                <td>{teamName(tournamentTeam.teamId)}</td>
                <td>{tournamentTeamStatusLabels[tournamentTeam.status]}</td>
                <td>{tournamentTeam.activePlayers}</td>
                <td>
                  <Link to={rosterLink(tournamentTeam.id)}>Открыть состав</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Заявить команду</h2>
      {availableTeams.length === 0 ? (
        <p className="notice">
          Все команды из справочника уже заявлены.{' '}
          <Link to="/teams">Добавить новую команду</Link>.
        </p>
      ) : (
        <form onSubmit={onSubmit}>
          <label>
            Команда
            <select name="teamId" required defaultValue="">
              <option value="" disabled>
                Выберите команду
              </option>
              {availableTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                  {team.city ? ` (${team.city})` : ''}
                </option>
              ))}
            </select>
          </label>
          {formError && <p className="error">{formError}</p>}
          <ErrorText error={addTeam.error} />
          <button type="submit" disabled={addTeam.isPending}>
            Заявить на этап
          </button>
          <p className="hint">
            Одна команда — одна заявка на этап. В разных дивизионах одного турнира команда может
            играть в каждом — это отдельные заявки.
          </p>
        </form>
      )}
    </>
  )
}
