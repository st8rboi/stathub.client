import { useState } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { CreatePlayerForm } from '../components/CreatePlayerForm'
import { useDeletePlayer, usePlayers, useUpdatePlayer } from '../hooks'

interface PlayerDraft {
  id: string
  fullName: string
  birthDate: string
}

export default function PlayersPage() {
  const [query, setQuery] = useState('')
  const players = usePlayers(query.trim())
  const updatePlayer = useUpdatePlayer()
  const deletePlayer = useDeletePlayer()

  // Редактируемая строка: правка идёт прямо в таблице, одна строка за раз.
  const [draft, setDraft] = useState<PlayerDraft | null>(null)

  const saveDraft = () => {
    if (!draft) return
    updatePlayer.mutate(
      { id: draft.id, body: { fullName: draft.fullName, birthDate: draft.birthDate || null } },
      { onSuccess: () => setDraft(null) },
    )
  }

  return (
    <>
      <h1>Игроки</h1>
      <p>
        Игрок — это человек, а не заявка: он заводится один раз и может играть за разные команды
        в разных турнирах. Полные тёзки не склеиваются автоматически — поиск ниже подсказывает
        похожие имена, решение принимаете вы.
      </p>
      <p className="hint">
        Игрок общий для всех организаторов: исправить его можно, только если он не используется
        в чужих лигах, а удалить — только если его ещё нет ни в заявках, ни в протоколах матчей.
      </p>

      <h2>Новый игрок</h2>
      <CreatePlayerForm />

      <label>
        Поиск по ФИО (учитывает опечатки)
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="например, Иванов"
          maxLength={200}
        />
      </label>

      <ErrorText error={players.error ?? updatePlayer.error ?? deletePlayer.error} />
      {players.isPending && <p>Загрузка…</p>}
      {players.data?.length === 0 && (
        <p className="notice">
          {query.trim()
            ? 'По этому запросу игроков нет — можно добавить нового ниже.'
            : 'Игроков пока нет — добавьте первого ниже.'}
        </p>
      )}
      {players.data && players.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Дата рождения</th>
              <th>Добавлен</th>
              <th>ID</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {players.data.map((player) => {
              const isEditing = draft?.id === player.id

              return (
                <tr key={player.id}>
                  {isEditing ? (
                    <>
                      <td>
                        <input
                          value={draft.fullName}
                          onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && saveDraft()}
                          required
                          maxLength={200}
                          aria-label="ФИО"
                          autoFocus
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={draft.birthDate}
                          onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })}
                          aria-label="Дата рождения"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{player.fullName}</td>
                      <td>{player.birthDate ?? '—'}</td>
                    </>
                  )}
                  <td>{new Date(player.createdAtUtc).toLocaleString('ru-RU')}</td>
                  <td className="mono">{player.id}</td>
                  <td className="actions-cell">
                    {isEditing ? (
                      <div className="actions">
                        <button
                          type="button"
                          disabled={updatePlayer.isPending || !draft.fullName.trim()}
                          onClick={saveDraft}
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            setDraft(null)
                            updatePlayer.reset()
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <div className="actions">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            updatePlayer.reset()
                            setDraft({
                              id: player.id,
                              fullName: player.fullName,
                              birthDate: player.birthDate ?? '',
                            })
                          }}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={deletePlayer.isPending}
                          onClick={() => {
                            // Сервер откажет (409), если игрок уже есть в заявках или событиях матчей.
                            if (confirm(`Удалить игрока «${player.fullName}»?`)) deletePlayer.mutate(player.id)
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}
