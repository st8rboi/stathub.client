import { useTournamentTeams } from '@/features/rosters/hooks'
import { useTeams } from '@/features/teams/hooks'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import { useCreateMatch, useStageMatches } from '../hooks'
import { matchStatusLabels } from '../labels'

/** Значение по умолчанию для datetime-local: ближайший час. */
function defaultStartValue(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Матчи этапа и создание нового. В выпадающих списках — только команды, заявленные
 * на этот турнир: так матч нельзя случайно создать с командой, которой в сезоне нет.
 */
export function MatchesSection({
  leagueId,
  tournamentId,
  stageId,
}: {
  leagueId: string
  tournamentId: string
  stageId: string
}) {
  const matches = useStageMatches(stageId)
  const allTeams = useTeams()
  const tournamentTeams = useTournamentTeams(tournamentId)
  const create = useCreateMatch(stageId)

  const [formError, setFormError] = useState<string | null>(null)

  const teamName = (teamId: string) =>
    allTeams.data?.find((team) => team.id === teamId)?.name ?? teamId.slice(0, 8)

  const registeredTeamIds = new Set(
    (tournamentTeams.data ?? [])
      .filter((tournamentTeam) => tournamentTeam.status === 'Active')
      .map((tournamentTeam) => tournamentTeam.teamId),
  )

  const teamOptions = (allTeams.data ?? []).filter((team) => registeredTeamIds.has(team.id))
  const noRegisteredTeams = tournamentTeams.data?.length === 0

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formElement = e.currentTarget
    const form = new FormData(formElement)

    const homeTeamId = String(form.get('homeTeamId') ?? '')
    const awayTeamId = String(form.get('awayTeamId') ?? '')
    const start = String(form.get('start') ?? '')

    if (!homeTeamId || !awayTeamId) {
      setFormError('Выберите обе команды.')
      return
    }
    if (homeTeamId === awayTeamId) {
      setFormError('Команды должны быть разными.')
      return
    }
    if (!start) {
      setFormError('Укажите дату и время начала.')
      return
    }

    setFormError(null)
    create.mutate(
      {
        stageId,
        homeTeamId,
        awayTeamId,
        // datetime-local отдаёт локальное время — на сервер уходит UTC.
        startTimeUtc: new Date(start).toISOString(),
      },
      { onSuccess: () => formElement.reset() },
    )
  }

  return (
    <>
      <ErrorText error={matches.error} />
      {matches.isPending && <p>Загрузка…</p>}
      {matches.data?.length === 0 && <p className="notice">Матчей на этом этапе пока нет.</p>}
      {matches.data && matches.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Начало</th>
              <th>Команды</th>
              <th>Счёт</th>
              <th>Статус</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {matches.data.map((match) => (
              <tr key={match.id}>
                <td>{new Date(match.scheduledTimeUtc).toLocaleString('ru-RU')}</td>
                <td>
                  {teamName(match.homeTeamId)} — {teamName(match.awayTeamId)}
                </td>
                <td>
                  {match.homeScore} : {match.awayScore}
                </td>
                <td>{matchStatusLabels[match.status]}</td>
                <td className="mono">{match.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Новый матч</h2>
      {noRegisteredTeams ? (
        <p className="notice">
          В турнире нет заявленных команд. Заявите их на{' '}
          <Link to={`/leagues/${leagueId}/tournaments/${tournamentId}`}>странице турнира</Link> —
          матч создаётся только между участниками сезона.
        </p>
      ) : (
        <form onSubmit={onSubmit}>
          <label>
            Хозяева
            <select name="homeTeamId" required defaultValue="">
              <option value="" disabled>
                Выберите команду
              </option>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Гости
            <select name="awayTeamId" required defaultValue="">
              <option value="" disabled>
                Выберите команду
              </option>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Начало (местное время)
            <input name="start" type="datetime-local" required defaultValue={defaultStartValue()} />
          </label>
          {formError && <p className="error">{formError}</p>}
          <ErrorText error={create.error} />
          <button type="submit" disabled={create.isPending}>
            Создать матч
          </button>
          <p className="hint">
            Регламент (периоды, доп. время, пенальти) сервер снимает с правил этапа при создании матча.
          </p>
        </form>
      )}
    </>
  )
}
