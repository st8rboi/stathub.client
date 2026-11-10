import { useState, type FormEvent } from 'react'
import { usePlayersByIds } from '@/features/players/hooks'
import { useTournamentTeam, useTournamentTeams } from '@/features/rosters/hooks'
import { useTeams } from '@/features/teams/hooks'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useIssueDisqualification } from './api'

/**
 * Выдача дисквалификации: этап → команда → игрок из её активного состава.
 * Если этап один, он выбран сразу.
 */
export function IssueDisqualificationForm({
  tournamentId,
  stages,
  onDone,
}: {
  tournamentId: string
  stages: { id: string; name: string }[]
  onDone: () => void
}) {
  const issue = useIssueDisqualification(tournamentId)

  const [stageId, setStageId] = useState(stages.length === 1 ? stages[0].id : '')
  // id заявки этапа (для карточки состава) и id команды (для самой дисквалификации) — это разные вещи.
  const [teamRefId, setTeamRefId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const stageTeams = useTournamentTeams(stageId)
  const selectedTeam = (stageTeams.data ?? []).find((team) => team.id === teamRefId)
  const teamId = selectedTeam?.teamId ?? ''
  const teamDetails = useTournamentTeam(stageId, teamRefId)
  const allTeams = useTeams()

  // В заявке хранится только TeamId: название берём из справочника команд.
  const teamName = (id: string) => allTeams.data?.find((team) => team.id === id)?.name ?? id.slice(0, 8)

  const activeRegistrations = (teamDetails.data?.registrations ?? []).filter(
    (registration) => registration.status === 'Active',
  )
  const players = usePlayersByIds([...new Set(activeRegistrations.map((item) => item.playerId))])

  const playerName = (playerId: string) =>
    players.data?.find((player) => player.id === playerId)?.fullName ?? playerId.slice(0, 8)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    const playerId = String(form.get('playerId') ?? '')
    const reason = String(form.get('reason') ?? '').trim()
    const rawBan = String(form.get('matchesBanned') ?? '').trim()

    if (!teamId || !playerId || !reason) {
      setFormError('Выберите команду, игрока и укажите причину.')
      return
    }

    const matchesBanned = rawBan ? Number(rawBan) : null
    if (matchesBanned !== null && (!Number.isFinite(matchesBanned) || matchesBanned <= 0)) {
      setFormError('Срок — положительное число матчей или пустое поле (бессрочно).')
      return
    }

    setFormError(null)
    issue.mutate(
      {
        teamId,
        playerId,
        reason,
        matchesBanned: matchesBanned === null ? null : Math.round(matchesBanned),
        comment: null,
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="row">
        {stages.length > 1 && (
          <label>
            Этап
            <select
              value={stageId}
              onChange={(event) => {
                setStageId(event.target.value)
                setTeamRefId('')
              }}
            >
              <option value="">выберите этап</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          Команда
          <select value={teamRefId} onChange={(event) => setTeamRefId(event.target.value)} disabled={!stageId}>
            <option value="">{stageId ? 'выберите команду' : 'сначала выберите этап'}</option>
            {(stageTeams.data ?? []).map((team) => (
              <option key={team.id} value={team.id}>
                {teamName(team.teamId)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Игрок
        <select name="playerId" required disabled={!teamId}>
          <option value="">
            {!teamId
              ? 'сначала выберите команду'
              : activeRegistrations.length === 0
                ? 'в составе нет активных игроков'
                : 'выберите игрока'}
          </option>
          {activeRegistrations.map((registration) => (
            <option key={registration.id} value={registration.playerId}>
              {playerName(registration.playerId)}
              {registration.squadNumber ? ` (№${registration.squadNumber})` : ''}
            </option>
          ))}
        </select>
      </label>

      <label>
        Причина
        <input name="reason" required maxLength={500} placeholder="например, удаление в матче" />
      </label>

      <label>
        Пропустить матчей
        <input name="matchesBanned" type="number" min={1} max={100} placeholder="пусто — бессрочно" />
      </label>

      <p className="hint">
        Срок отбывается матчами этой команды в турнире. Пока дисквалификация действует, сервер отклонит гол, карточку
        или замену с участием игрока.
      </p>

      {formError && <p className="error">{formError}</p>}
      <ErrorText error={issue.error} />
      <div className="actions">
        <button type="submit" className="danger-solid" disabled={issue.isPending || !teamId}>
          Дисквалифицировать
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          Отмена
        </button>
      </div>
    </form>
  )
}
