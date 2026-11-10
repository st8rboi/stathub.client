import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import { usePlayers } from '@/features/players/hooks'
import { formatDate } from '@/shared/lib/format'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { useRegisterPlayer } from '../hooks'
import { parseSquadNumber } from '../squadNumber'

/**
 * Заявка игрока в состав: поиск по справочнику (с учётом опечаток), выбор, номер.
 * Окно не закрывается после заявки — состав обычно вносят сразу целиком.
 */
export function RegisterPlayerForm({
  stageId,
  tournamentTeamId,
  activePlayerIds,
  onDone,
}: {
  stageId: string
  tournamentTeamId: string
  /** Уже заявленные в эту команду — их не предлагаем. */
  activePlayerIds: Set<string>
  onDone: () => void
}) {
  const register = useRegisterPlayer(stageId, tournamentTeamId)

  const [query, setQuery] = useState('')
  const search = useDebouncedValue(query.trim())
  const found = usePlayers(search, search.length >= 2)

  const [playerId, setPlayerId] = useState('')
  const [squadNumber, setSquadNumber] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const results = found.data ?? []

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!playerId) return

    const name = results.find((player) => player.id === playerId)?.fullName ?? 'Игрок'
    register.mutate(
      { playerId, squadNumber: parseSquadNumber(squadNumber) },
      {
        onSuccess: () => {
          setNotice(`${name} заявлен${squadNumber ? ` под №${squadNumber}` : ''}.`)
          setPlayerId('')
          setSquadNumber('')
          setQuery('')
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <label className="search-field">
        <span className="visually-hidden">Поиск игрока по ФИО</span>
        <Icon name="search" size={18} />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setNotice(null)
          }}
          placeholder="ФИО игрока — опечатки учитываются"
          maxLength={200}
          autoFocus
        />
      </label>

      {search.length < 2 ? (
        <p className="hint">Начните вводить фамилию — покажем игроков из справочника.</p>
      ) : found.isPending ? (
        <p className="muted">Ищем…</p>
      ) : results.length === 0 ? (
        <p className="muted">
          Никого не нашли. <Link to="/players">Добавьте игрока в справочник</Link> — потом его можно заявить.
        </p>
      ) : (
        <ul className="check-list" role="radiogroup" aria-label="Найденные игроки">
          {results.map((player) => {
            const inSquad = activePlayerIds.has(player.id)
            return (
              <li key={player.id}>
                <label className="check">
                  <input
                    type="radio"
                    name="playerId"
                    value={player.id}
                    checked={playerId === player.id}
                    disabled={inSquad}
                    onChange={() => setPlayerId(player.id)}
                  />
                  <span>
                    {player.fullName}
                    {player.birthDate && <span className="muted"> · {formatDate(player.birthDate)}</span>}
                    {inSquad && <span className="muted"> · уже в составе</span>}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <div className="row">
        <label>
          Игровой номер
          <input
            type="number"
            min={1}
            max={999}
            value={squadNumber}
            onChange={(event) => setSquadNumber(event.target.value)}
            placeholder="необязательно"
          />
        </label>
      </div>

      <ErrorText error={register.error} />
      {notice && <p className="success-text">{notice}</p>}

      <div className="actions">
        <button type="submit" disabled={!playerId || register.isPending}>
          {register.isPending ? 'Заявляем…' : 'Заявить'}
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          {notice ? 'Готово' : 'Отмена'}
        </button>
      </div>
    </form>
  )
}
