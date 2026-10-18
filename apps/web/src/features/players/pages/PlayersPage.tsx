import { useState } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { CreatePlayerForm } from '../components/CreatePlayerForm'
import { usePlayers } from '../hooks'

export default function PlayersPage() {
  const [query, setQuery] = useState('')
  const players = usePlayers(query.trim())

  return (
    <>
      <h1>Игроки</h1>
      <p>
        Игрок — это человек, а не заявка: он заводится один раз и может играть за разные команды
        в разных турнирах. Полные тёзки не склеиваются автоматически — поиск ниже подсказывает
        похожие имена, решение принимаете вы.
      </p>

      <label>
        Поиск по ФИО (учитывает опечатки)
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="например, Иванов"
          maxLength={200}
        />
      </label>

      <ErrorText error={players.error} />
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
            </tr>
          </thead>
          <tbody>
            {players.data.map((player) => (
              <tr key={player.id}>
                <td>{player.fullName}</td>
                <td>{player.birthDate ?? '—'}</td>
                <td>{new Date(player.createdAtUtc).toLocaleString('ru-RU')}</td>
                <td className="mono">{player.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Новый игрок</h2>
      <CreatePlayerForm />
    </>
  )
}
