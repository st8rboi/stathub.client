import { useState, type FormEvent } from 'react'
import { usePlayersByIds } from '@/features/players/hooks'
import { useTournamentTeam, useTournamentTeams } from '@/features/rosters/hooks'
import { useTeams } from '@/features/teams/hooks'
import { ErrorText } from '@/shared/ui/ErrorText'
import {
  useDisqualifications,
  useIssueDisqualification,
  useLiftDisqualification,
} from './api'

/**
 * Дисциплинарный учёт турнира: дисквалификация игрока в его команде на N матчей
 * (или бессрочно). Отбытое считается по завершённым матчам команды после выдачи.
 */
export function DisciplineSection({
  tournamentId,
  stages,
}: {
  tournamentId: string
  stages: { id: string; name: string }[]
}) {
  const list = useDisqualifications(tournamentId)
  const issue = useIssueDisqualification(tournamentId)
  const lift = useLiftDisqualification()

  const [stageId, setStageId] = useState('')
  // id заявки этапа (для карточки состава) и id команды (для самой дисквалификации) — это разные вещи.
  const [teamRefId, setTeamRefId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const stageTeams = useTournamentTeams(stageId)
  const selectedTeam = (stageTeams.data ?? []).find((team) => team.id === teamRefId)
  const teamId = selectedTeam?.teamId ?? ''
  const teamDetails = useTournamentTeam(stageId, teamRefId)
  const allTeams = useTeams()

  // В заявке хранится только TeamId: название берём из справочника команд.
  const teamName = (id: string) =>
    allTeams.data?.find((team) => team.id === id)?.name ?? id.slice(0, 8)

  const activeRegistrations = (teamDetails.data?.registrations ?? []).filter(
    (registration) => registration.status === 'Active',
  )
  const players = usePlayersByIds([...new Set(activeRegistrations.map((item) => item.playerId))])

  const playerName = (playerId: string) =>
    players.data?.find((player) => player.id === playerId)?.fullName ?? playerId.slice(0, 8)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)

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
      {
        onSuccess: () => {
          formElement.reset()
          setFormError(null)
        },
      },
    )
  }

  return (
    <>
      <ErrorText error={list.error ?? issue.error ?? lift.error} />

      {list.data?.length === 0 ? (
        <p className="notice">Дисквалификаций нет.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Команда</th>
              <th>Игрок</th>
              <th>Причина</th>
              <th>Срок</th>
              <th>Осталось</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.teamName || item.teamId.slice(0, 8)}</td>
                <td>{item.playerName || item.playerId.slice(0, 8)}</td>
                <td>{item.reason}</td>
                <td>{item.matchesBanned ?? 'бессрочно'}</td>
                <td>
                  {item.matchesBanned === null ? '—' : Math.max(0, item.matchesBanned - item.matchesServed)}
                </td>
                <td>{item.isActive ? 'действует' : item.liftedAtUtc ? 'снята' : 'отбыта'}</td>
                <td>
                  {item.isActive && (
                    <button
                      type="button"
                      className="danger"
                      disabled={lift.isPending}
                      onClick={() => lift.mutate({ id: item.id, comment: null })}
                    >
                      Снять
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Дисквалифицировать игрока</h2>
      <form onSubmit={onSubmit}>
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

        <label>
          Команда
          <select
            value={teamRefId}
            onChange={(event) => setTeamRefId(event.target.value)}
            disabled={!stageId}
          >
            <option value="">выберите команду</option>
            {(stageTeams.data ?? []).map((team) => (
              <option key={team.id} value={team.id}>
                {teamName(team.teamId)}
              </option>
            ))}
          </select>
        </label>

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
          Пропустить матчей (пусто — бессрочно)
          <input name="matchesBanned" type="number" min={1} max={100} />
        </label>

        {formError && <p className="error">{formError}</p>}
        <button type="submit" disabled={issue.isPending || !teamId}>
          Дисквалифицировать
        </button>
        <p className="hint">
          Срок отбывается матчами этой команды в турнире. Пока дисквалификация действует, сервер
          отклонит гол, карточку или замену с участием игрока.
        </p>
      </form>
    </>
  )
}
