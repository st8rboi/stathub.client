import { useState, type SubmitEvent } from 'react'
import { formatDate } from '@/shared/lib/format'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { CopyField } from '@/shared/ui/CopyField'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useCreatePlayer, usePlayers, useUpdatePlayer } from '../hooks'
import type { Player } from '../types'

/** Ищем похожих, начиная с этой длины ФИО: на 1–2 буквы совпадает полсправочника. */
const SIMILAR_MIN_LENGTH = 4
const SIMILAR_LIMIT = 5

/**
 * Создание или правка игрока. При вводе ФИО показываем похожих игроков из справочника:
 * полные тёзки не склеиваются автоматически, решение — за организатором.
 */
export function PlayerForm({ player, onDone }: { player?: Player; onDone: () => void }) {
  const create = useCreatePlayer()
  const update = useUpdatePlayer()
  const mutation = player ? update : create

  const [fullName, setFullName] = useState(player?.fullName ?? '')
  const search = useDebouncedValue(fullName.trim())
  const similarQuery = usePlayers(search, search.length >= SIMILAR_MIN_LENGTH && search !== player?.fullName)
  const similar = (similarQuery.data ?? []).filter((item) => item.id !== player?.id).slice(0, SIMILAR_LIMIT)

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const body = { fullName: fullName.trim(), birthDate: String(form.get('birthDate')) || null }

    if (player) update.mutate({ id: player.id, body }, { onSuccess: onDone })
    else create.mutate(body, { onSuccess: onDone })
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        ФИО
        <input
          name="fullName"
          required
          maxLength={200}
          placeholder="Иванов Иван Иванович"
          autoFocus={!player}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </label>

      {similar.length > 0 && (
        <div className="similar" role="status">
          <p>Похожие игроки уже есть в справочнике:</p>
          <ul>
            {similar.map((item) => (
              <li key={item.id}>
                {item.fullName}
                {item.birthDate && <span className="muted"> · {formatDate(item.birthDate)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <label>
        Дата рождения
        <input name="birthDate" type="date" defaultValue={player?.birthDate ?? ''} />
        <span className="hint">Помогает отличить тёзок.</span>
      </label>

      {player && (
        <p className="hint">
          Исправить игрока можно, только если он не используется в чужих лигах.
        </p>
      )}

      <ErrorText error={mutation.error} />
      <div className="actions">
        <button type="submit" disabled={mutation.isPending}>
          {player ? 'Сохранить' : mutation.isPending ? 'Добавляем…' : 'Добавить игрока'}
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          {player ? 'Закрыть' : 'Отмена'}
        </button>
      </div>

      {player && <CopyField label="ID" value={player.id} />}
    </form>
  )
}
