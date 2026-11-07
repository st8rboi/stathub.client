import { useState, type SubmitEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { usePlayers, usePlayersByIds } from '@/features/players/hooks'
import { useTeams } from '@/features/teams/hooks'
import { ErrorText } from '@/shared/ui/ErrorText'
import {
  useChangeSquadNumber,
  useDeleteRegistration,
  useDeleteTournamentTeam,
  useRegisterPlayer,
  useReleasePlayer,
  useTournamentTeam,
  useTournamentTeams,
  useTransferPlayer,
  useWithdrawTournamentTeam,
} from '../hooks'
import { registrationStatusLabels, tournamentTeamStatusLabels } from '../labels'

function parseSquadNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Состав команды на этапе: заявка игрока, отзаявка и трансфер.
 * История заявок не скрывается — закрытые строки остаются с датой и статусом.
 */
export default function TournamentTeamPage() {
  const { leagueId = '', tournamentId = '', stageId = '', tournamentTeamId = '' } = useParams()

  const details = useTournamentTeam(stageId, tournamentTeamId)
  const tournamentTeams = useTournamentTeams(stageId)
  const allTeams = useTeams()

  const [playerQuery, setPlayerQuery] = useState('')
  const foundPlayers = usePlayers(playerQuery.trim())

  const [formError, setFormError] = useState<string | null>(null)

  const registrations = details.data?.registrations ?? []
  const playerIds = [...new Set(registrations.map((registration) => registration.playerId))]
  const playersByIds = usePlayersByIds(playerIds)

  const register = useRegisterPlayer(stageId, tournamentTeamId)
  const release = useReleasePlayer(stageId, tournamentTeamId)
  const withdraw = useWithdrawTournamentTeam(stageId, tournamentTeamId)
  const changeNumber = useChangeSquadNumber(stageId, tournamentTeamId)
  const deleteRegistration = useDeleteRegistration(stageId, tournamentTeamId)
  const deleteTeam = useDeleteTournamentTeam(stageId, tournamentTeamId)
  const navigate = useNavigate()

  // Заявка, у которой сейчас правится номер, и черновик номера (строка из поля ввода).
  const [numberDraft, setNumberDraft] = useState<{ registrationId: string; value: string } | null>(null)

  const teamId = details.data?.teamId ?? ''
  const transfer = useTransferPlayer(stageId, teamId)

  const teamName = (id: string) =>
    allTeams.data?.find((team) => team.id === id)?.name ?? id.slice(0, 8)
  const playerName = (id: string) =>
    playersByIds.data?.find((player) => player.id === id)?.fullName ?? id.slice(0, 8)

  if (details.error) return <ErrorText error={details.error} />
  if (!details.data) return <p>Загрузка…</p>

  const { data } = details
  const activeRegistrations = registrations.filter((registration) => registration.status === 'Active')
  const otherTeams = (tournamentTeams.data ?? []).filter(
    (tournamentTeam) => tournamentTeam.id !== tournamentTeamId && tournamentTeam.status === 'Active',
  )

  const stageLink = `/leagues/${leagueId}/tournaments/${tournamentId}/stages/${stageId}`

  const saveNumber = () => {
    if (!numberDraft) return
    changeNumber.mutate(
      { registrationId: numberDraft.registrationId, squadNumber: parseSquadNumber(numberDraft.value) },
      { onSuccess: () => setNumberDraft(null) },
    )
  }

  const onRegister = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formElement = e.currentTarget
    const form = new FormData(formElement)
    const playerId = String(form.get('playerId') ?? '')

    if (!playerId) {
      setFormError('Выберите игрока из подсказок.')
      return
    }

    setFormError(null)
    register.mutate(
      { playerId, squadNumber: parseSquadNumber(form.get('squadNumber')) },
      { onSuccess: () => formElement.reset() },
    )
  }

  const onTransfer = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formElement = e.currentTarget
    const form = new FormData(formElement)
    const playerId = String(form.get('playerId') ?? '')
    const toTeamId = String(form.get('toTeamId') ?? '')

    if (!playerId || !toTeamId) {
      setFormError('Выберите игрока и команду назначения.')
      return
    }

    setFormError(null)
    transfer.mutate(
      { playerId, toTeamId, squadNumber: parseSquadNumber(form.get('squadNumber')) },
      { onSuccess: () => formElement.reset() },
    )
  }

  return (
    <>
      <p>
        <Link to={stageLink}>← К этапу</Link>
      </p>
      <h1>{teamName(data.teamId)}</h1>

      <dl>
        <dt>Статус заявки</dt>
        <dd>{tournamentTeamStatusLabels[data.status]}</dd>
        <dt>Игроков заявлено</dt>
        <dd>{activeRegistrations.length}</dd>
      </dl>

      <div className="actions">
        {data.status === 'Active' && (
          <button
            type="button"
            className="danger"
            disabled={withdraw.isPending || deleteTeam.isPending}
            onClick={() => {
              if (confirm('Снять команду с турнира? Все активные заявки игроков закроются.')) {
                withdraw.mutate()
              }
            }}
          >
            Снять команду с турнира
          </button>
        )}
        <button
          type="button"
          className="danger"
          disabled={withdraw.isPending || deleteTeam.isPending}
          onClick={() => {
            // Сервер откажет (409), если у команды уже есть матчи на этапе — тогда её снимают.
            if (confirm('Удалить ошибочную заявку команды вместе с составом? Это действие нельзя отменить.')) {
              deleteTeam.mutate(undefined, { onSuccess: () => void navigate(stageLink) })
            }
          }}
        >
          Удалить заявку
        </button>
      </div>
      <p className="hint">
        «Снять с турнира» сохраняет историю. «Удалить заявку» — только для ошибочно заявленной команды
        без матчей на этапе.
      </p>
      <ErrorText error={withdraw.error ?? deleteTeam.error} />

      <h2>Заявки игроков</h2>
      {registrations.length === 0 ? (
        <p className="notice">Состав пуст — заявите первого игрока ниже.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Игрок</th>
              <th>Статус</th>
              <th>Заявлен</th>
              <th>Закрыта</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((registration) => (
              <tr key={registration.id}>
                <td>
                  {numberDraft?.registrationId === registration.id ? (
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={numberDraft.value}
                      onChange={(e) => setNumberDraft({ ...numberDraft, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveNumber()
                        if (e.key === 'Escape') setNumberDraft(null)
                      }}
                      aria-label="Игровой номер"
                      autoFocus
                    />
                  ) : (
                    (registration.squadNumber ?? '—')
                  )}
                </td>
                <td>{playerName(registration.playerId)}</td>
                <td>{registrationStatusLabels[registration.status]}</td>
                <td>{registration.joinedOn}</td>
                <td>{registration.leftOn ?? '—'}</td>
                <td className="actions-cell">
                  <div className="actions">
                    {numberDraft?.registrationId === registration.id ? (
                      <>
                        <button type="button" disabled={changeNumber.isPending} onClick={saveNumber}>
                          Сохранить
                        </button>
                        <button type="button" className="secondary" onClick={() => setNumberDraft(null)}>
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        {registration.status === 'Active' && (
                          <>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => {
                                changeNumber.reset()
                                setNumberDraft({
                                  registrationId: registration.id,
                                  value: registration.squadNumber?.toString() ?? '',
                                })
                              }}
                            >
                              Номер
                            </button>
                            <button
                              type="button"
                              disabled={release.isPending}
                              onClick={() => {
                                if (confirm('Отзаявить игрока? Заявка останется в истории.')) {
                                  release.mutate(registration.id)
                                }
                              }}
                            >
                              Отзаявить
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="danger"
                          disabled={deleteRegistration.isPending}
                          onClick={() => {
                            // Сервер откажет (409), если у игрока уже есть события в матчах за команду.
                            if (confirm('Удалить ошибочную заявку? В истории она не останется.')) {
                              deleteRegistration.mutate(registration.id)
                            }
                          }}
                        >
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ErrorText error={release.error ?? changeNumber.error ?? deleteRegistration.error} />
      {registrations.length > 0 && (
        <p className="hint">
          Уход игрока оформляйте отзаявкой или трансфером — заявка останется в истории. «Удалить» —
          только для ошибочной заявки, по которой нет событий в матчах.
        </p>
      )}

      <h2>Заявить игрока</h2>
      {data.status !== 'Active' ? (
        <p className="notice">Команда снята с турнира — новые заявки недоступны.</p>
      ) : (
        <>
          <label>
            Поиск игрока по ФИО (учитывает опечатки)
            <input
              value={playerQuery}
              onChange={(e) => setPlayerQuery(e.target.value)}
              placeholder="например, Иванов"
              maxLength={200}
            />
          </label>

          <form onSubmit={onRegister}>
            <label>
              Игрок
              <select name="playerId" required defaultValue="">
                <option value="" disabled>
                  Выберите игрока
                </option>
                {(foundPlayers.data ?? []).map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.fullName}
                    {player.birthDate ? `, ${player.birthDate}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Игровой номер (необязательно)
              <input name="squadNumber" type="number" min={1} max={999} />
            </label>
            {formError && <p className="error">{formError}</p>}
            <ErrorText error={register.error} />
            <button type="submit" disabled={register.isPending}>
              Заявить игрока
            </button>
            <p className="hint">
              Нет нужного игрока? <Link to="/players">Добавьте его в справочник</Link> — заявка
              ссылается на игрока по идентификатору.
            </p>
          </form>
        </>
      )}

      <h2>Трансфер</h2>
      {activeRegistrations.length === 0 ? (
        <p className="notice">Некого переводить: в команде нет активных заявок.</p>
      ) : otherTeams.length === 0 ? (
        <p className="notice">В турнире нет других команд — заявите их на странице турнира.</p>
      ) : data.status !== 'Active' ? (
        <p className="notice">Команда снята с турнира — трансферы недоступны.</p>
      ) : (
        <form onSubmit={onTransfer}>
          <label>
            Игрок
            <select name="playerId" required defaultValue="">
              <option value="" disabled>
                Выберите игрока
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
            Команда назначения
            <select name="toTeamId" required defaultValue="">
              <option value="" disabled>
                Выберите команду
              </option>
              {otherTeams.map((tournamentTeam) => (
                <option key={tournamentTeam.id} value={tournamentTeam.teamId}>
                  {teamName(tournamentTeam.teamId)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Новый игровой номер (необязательно)
            <input name="squadNumber" type="number" min={1} max={999} />
          </label>
          <ErrorText error={transfer.error} />
          <button type="submit" disabled={transfer.isPending}>
            Перевести игрока
          </button>
          <p className="hint">
            Старая заявка закроется со статусом «Перешёл в другую команду» и датой — история матчей
            и событий не пострадает.
          </p>
        </form>
      )}
    </>
  )
}
