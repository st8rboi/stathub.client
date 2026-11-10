import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import { useTeams } from '@/features/teams/hooks'
import { errorMessage } from '@/shared/lib/errors'
import { Icon } from '@/shared/ui/Icon'
import { LogoBadge } from '@/shared/ui/layout'
import { useAddTournamentTeam } from '../hooks'

/**
 * Заявка команд на этап пачкой: поиск по справочнику и галочки.
 * Заявки отправляются по очереди; не прошедшие остаются отмеченными с причиной.
 */
export function RegisterTeamsForm({
  stageId,
  registeredTeamIds,
  onDone,
}: {
  stageId: string
  registeredTeamIds: Set<string>
  onDone: () => void
}) {
  const allTeams = useTeams()
  const addTeam = useAddTournamentTeam(stageId)

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [failures, setFailures] = useState<string[]>([])

  const available = (allTeams.data ?? []).filter((team) => !registeredTeamIds.has(team.id))
  const needle = query.trim().toLowerCase()
  const shown = needle
    ? available.filter((team) => `${team.name} ${team.city ?? ''}`.toLowerCase().includes(needle))
    : available

  const toggle = (teamId: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setFailures([])

    const failed: string[] = []
    const errors: string[] = []
    // По очереди: так сервер видит заявки в предсказуемом порядке, а ошибки привязаны к команде.
    for (const teamId of selected) {
      try {
        await addTeam.mutateAsync(teamId)
      } catch (error) {
        failed.push(teamId)
        const name = available.find((team) => team.id === teamId)?.name ?? teamId.slice(0, 8)
        errors.push(`${name}: ${errorMessage(error)}`)
      }
    }

    setBusy(false)
    if (failed.length === 0) {
      onDone()
      return
    }
    setSelected(new Set(failed))
    setFailures(errors)
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <label className="search-field">
        <span className="visually-hidden">Поиск команды</span>
        <Icon name="search" size={18} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Название или город"
          autoFocus
        />
      </label>

      {allTeams.isPending ? (
        <p className="muted">Загрузка…</p>
      ) : available.length === 0 ? (
        <p className="notice">
          Все команды из справочника уже заявлены. <Link to="/teams">Добавить новую команду</Link>
        </p>
      ) : shown.length === 0 ? (
        <p className="muted">
          Ничего не найдено. <Link to="/teams">Добавить команду в справочник</Link>
        </p>
      ) : (
        <ul className="check-list">
          {shown.map((team) => (
            <li key={team.id}>
              <label className="check">
                <input type="checkbox" checked={selected.has(team.id)} onChange={() => toggle(team.id)} />
                <LogoBadge src={team.logoUrl} name={team.name} size="sm" />
                <span>
                  {team.name}
                  {team.city && <span className="muted"> · {team.city}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <p className="hint">
        Одна команда — одна заявка на этап. В разных этапах одного турнира команда может играть в каждом — это отдельные
        заявки.
      </p>

      {failures.map((failure) => (
        <p key={failure} className="error">
          {failure}
        </p>
      ))}

      <div className="actions">
        <button type="submit" disabled={busy || selected.size === 0}>
          {busy ? 'Заявляем…' : selected.size > 0 ? `Заявить (${selected.size})` : 'Заявить'}
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          Отмена
        </button>
      </div>
    </form>
  )
}
