import { useState, type SubmitEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useTransferPlayer } from '../hooks'

/**
 * Трансфер игрока в другую команду дивизиона. Старая заявка закрывается со статусом
 * «Перешёл в другую команду» — история матчей и событий не страдает.
 */
export function TransferPlayerForm({
  divisionId,
  fromTeamId,
  players,
  teams,
  initialPlayerId = '',
  onDone,
}: {
  divisionId: string
  fromTeamId: string
  /** Активные заявки команды: playerId + подпись. */
  players: { id: string; label: string }[]
  /** Команды назначения: teamId + название. */
  teams: { id: string; name: string }[]
  initialPlayerId?: string
  onDone: () => void
}) {
  const transfer = useTransferPlayer(divisionId, fromTeamId)
  const [playerId, setPlayerId] = useState(initialPlayerId)
  const [toTeamId, setToTeamId] = useState('')

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    transfer.mutate({ playerId, toTeamId }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Игрок
        <select value={playerId} onChange={(event) => setPlayerId(event.target.value)} required>
          <option value="" disabled>
            Выберите игрока
          </option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        В команду
        <select value={toTeamId} onChange={(event) => setToTeamId(event.target.value)} required>
          <option value="" disabled>
            Выберите команду
          </option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">
        Старая заявка закроется со статусом «Перешёл в другую команду» и датой — история матчей и событий не пострадает.
      </p>
      <ErrorText error={transfer.error} />
      <div className="actions">
        <button type="submit" disabled={!playerId || !toTeamId || transfer.isPending}>
          Перевести
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          Отмена
        </button>
      </div>
    </form>
  )
}
