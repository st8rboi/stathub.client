import { useState } from 'react'
import { ageFromBirthDate, formatDate, plural } from '@/shared/lib/format'
import { initials } from '@/shared/lib/initials'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Card, EmptyState, Loading, PageHeader } from '@/shared/ui/layout'
import { Menu, MenuButton } from '@/shared/ui/Menu'
import { Modal } from '@/shared/ui/Modal'
import { PlayerForm } from '../components/PlayerForm'
import { useDeletePlayer, usePlayers } from '../hooks'
import type { Player } from '../types'

/** «12 мар. 1995 г. · 31 год» или «—», если дата не указана. */
function birthLabel(player: Player): string | null {
  if (!player.birthDate) return null
  return `${formatDate(player.birthDate)} · ${plural(ageFromBirthDate(player.birthDate), ['год', 'года', 'лет'])}`
}

/** Справочник игроков: поиск (с учётом опечаток), таблица, создание и правка в модальном окне. */
export default function PlayersPage() {
  const confirm = useConfirm()
  const [query, setQuery] = useState('')
  const search = useDebouncedValue(query.trim())
  const players = usePlayers(search)
  const deletePlayer = useDeletePlayer()

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = players.data?.find((player) => player.id === editingId)

  // При поиске сервер сортирует по похожести — порядок не трогаем; без поиска — по алфавиту.
  const list = search
    ? (players.data ?? [])
    : [...(players.data ?? [])].sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'))

  const createButton = (
    <button type="button" onClick={() => setCreating(true)}>
      <Icon name="plus" size={18} />
      Новый игрок
    </button>
  )

  return (
    <>
      <PageHeader title="Игроки" actions={createButton} />
      <details className="explainer">
        <summary>Как устроен справочник</summary>
        <p>
          Игрок — это человек, а не заявка: он заводится один раз и может играть за разные команды в разных турнирах.
          Полные тёзки не склеиваются автоматически — при добавлении мы подскажем похожие имена, решение за вами.
          Справочник общий для всех организаторов: исправить игрока можно, только если он не используется в чужих
          лигах, а удалить — только если его ещё нет ни в заявках, ни в протоколах матчей.
        </p>
      </details>

      <div className="directory-toolbar">
        <label className="search-field">
          <span className="visually-hidden">Поиск по ФИО</span>
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по ФИО — опечатки учитываются"
            maxLength={200}
          />
        </label>
        {players.data && players.data.length > 0 && (
          <p className="muted">{plural(players.data.length, ['игрок', 'игрока', 'игроков'])}</p>
        )}
      </div>

      <ErrorText error={players.error ?? deletePlayer.error} />
      {players.isPending && <Loading />}

      {players.data?.length === 0 &&
        (search ? (
          <EmptyState icon="search" title="Ничего не найдено" action={createButton}>
            По запросу «{search}» игроков нет — можно добавить нового.
          </EmptyState>
        ) : (
          <EmptyState icon="user" title="Игроков пока нет" action={createButton}>
            Добавьте игроков, чтобы заявлять их в составы команд.
          </EmptyState>
        ))}

      {list.length > 0 && (
        <Card flush>
          <table className="data-table">
            <thead>
              <tr>
                <th>Игрок</th>
                <th className="col-secondary">Дата рождения</th>
                <th className="col-secondary">Добавлен</th>
                <th>
                  <span className="visually-hidden">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((player) => {
                const birth = birthLabel(player)
                return (
                  <tr key={player.id}>
                    <td>
                      <div className="cell-main">
                        <span className="person-avatar" aria-hidden="true">
                          {initials(player.fullName)}
                        </span>
                        <span className="cell-text">
                          <button type="button" className="cell-title" onClick={() => setEditingId(player.id)}>
                            {player.fullName}
                          </button>
                          {/* На телефоне столбца с датой нет — показываем её под именем. */}
                          {birth && <span className="cell-sub mobile-only">{birth}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="col-secondary">{birth ?? <span className="muted">—</span>}</td>
                    <td className="col-secondary muted">{formatDate(player.createdAtUtc)}</td>
                    <td>
                      <Menu
                        triggerClassName="icon-button"
                        triggerLabel={`Действия с игроком ${player.fullName}`}
                        trigger={<Icon name="more" />}
                        align="end"
                      >
                        <MenuButton onClick={() => setEditingId(player.id)}>Изменить</MenuButton>
                        <MenuButton
                          danger
                          disabled={deletePlayer.isPending}
                          onClick={() =>
                            void confirm({
                              title: `Удалить игрока «${player.fullName}»?`,
                              message: 'Игрока, который уже есть в заявках или протоколах матчей, удалить не получится.',
                              confirmLabel: 'Удалить',
                              danger: true,
                            }).then((ok) => {
                              // Сервер откажет (409), если игрок уже есть в заявках или событиях матчей.
                              if (ok) deletePlayer.mutate(player.id)
                            })
                          }
                        >
                          Удалить
                        </MenuButton>
                      </Menu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый игрок">
        <PlayerForm onDone={() => setCreating(false)} />
      </Modal>

      <Modal open={editing !== undefined} onClose={() => setEditingId(null)} title="Игрок">
        {editing && <PlayerForm key={editing.id} player={editing} onDone={() => setEditingId(null)} />}
      </Modal>
    </>
  )
}
