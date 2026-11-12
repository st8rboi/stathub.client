import { useState } from 'react'
import { plural } from '@/shared/lib/format'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Card, EmptyState, Loading, LogoBadge, PageHeader } from '@/shared/ui/layout'
import { Menu, MenuButton } from '@/shared/ui/Menu'
import { Modal } from '@/shared/ui/Modal'
import { CreateTeamForm } from '../components/CreateTeamForm'
import { TeamEditor } from '../components/TeamEditor'
import { TEAMS_LIST_LIMIT } from '../api'
import { useDeleteTeam, useTeams } from '../hooks'

/** Справочник команд: поиск, таблица, создание и карточка команды в модальном окне. */
export default function TeamsPage() {
  const confirm = useConfirm()
  const [query, setQuery] = useState('')
  const search = useDebouncedValue(query.trim())
  const teams = useTeams(search)
  const deleteTeam = useDeleteTeam()

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = teams.data?.find((team) => team.id === editingId)

  const list = [...(teams.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  const createButton = (
    <button type="button" onClick={() => setCreating(true)}>
      <Icon name="plus" size={18} />
      Новая команда
    </button>
  )

  return (
    <>
      <PageHeader title="Команды" actions={createButton} />
      <details className="explainer">
        <summary>Как устроен справочник</summary>
        <p>
          Команда заводится один раз и переиспользуется во всех турнирах. Справочник общий для всех организаторов:
          изменить команду можно, только если она не используется в чужих лигах, а удалить — только если её ещё нет ни
          в заявках, ни в матчах.
        </p>
      </details>

      <div className="directory-toolbar">
        <label className="search-field">
          <span className="visually-hidden">Поиск по названию</span>
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию"
            maxLength={150}
          />
        </label>
        {teams.data && teams.data.length > 0 && (
          <p className="muted">
            {teams.data.length >= TEAMS_LIST_LIMIT
              ? `Показаны первые ${TEAMS_LIST_LIMIT} — уточните поиск`
              : plural(teams.data.length, ['команда', 'команды', 'команд'])}
          </p>
        )}
      </div>

      <ErrorText error={teams.error ?? deleteTeam.error} />
      {teams.isPending && <Loading />}

      {teams.data?.length === 0 &&
        (search ? (
          <EmptyState icon="search" title="Ничего не найдено" action={createButton}>
            По запросу «{search}» команд нет. Возможно, её ещё не добавили.
          </EmptyState>
        ) : (
          <EmptyState icon="shield" title="Команд пока нет" action={createButton}>
            Добавьте клубы, которые играют в ваших турнирах.
          </EmptyState>
        ))}

      {list.length > 0 && (
        <Card flush>
          <table className="data-table">
            <thead>
              <tr>
                <th>Команда</th>
                <th className="col-secondary">Город</th>
                <th>
                  <span className="visually-hidden">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((team) => (
                <tr key={team.id}>
                  <td>
                    <div className="cell-main">
                      <LogoBadge src={team.logoUrl} name={team.name} size="sm" />
                      <span className="cell-text">
                        <button type="button" className="cell-title" onClick={() => setEditingId(team.id)}>
                          {team.name}
                        </button>
                        {/* На телефоне столбца «Город» нет — показываем город под названием. */}
                        {team.city && <span className="cell-sub mobile-only">{team.city}</span>}
                      </span>
                    </div>
                  </td>
                  <td className="col-secondary">{team.city ?? <span className="muted">—</span>}</td>
                  <td>
                    <Menu
                      triggerClassName="icon-button"
                      triggerLabel={`Действия с командой «${team.name}»`}
                      trigger={<Icon name="more" />}
                      align="end"
                    >
                      <MenuButton onClick={() => setEditingId(team.id)}>Изменить</MenuButton>
                      <MenuButton
                        danger
                        disabled={deleteTeam.isPending}
                        onClick={() =>
                          void confirm({
                            title: `Удалить команду «${team.name}»?`,
                            message: 'Команду, которая уже есть в заявках или матчах, удалить не получится.',
                            confirmLabel: 'Удалить',
                            danger: true,
                          }).then((ok) => {
                            // Сервер откажет (409), если команда уже есть в заявках или матчах.
                            if (ok) deleteTeam.mutate(team.id)
                          })
                        }
                      >
                        Удалить
                      </MenuButton>
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Новая команда">
        <CreateTeamForm onDone={() => setCreating(false)} />
      </Modal>

      <Modal open={editing !== undefined} onClose={() => setEditingId(null)} title={editing?.name ?? ''}>
        {editing && <TeamEditor key={editing.id} team={editing} onDone={() => setEditingId(null)} />}
      </Modal>
    </>
  )
}
