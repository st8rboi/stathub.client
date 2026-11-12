import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import { TEAMS_LIST_LIMIT } from '@/features/teams/api'
import { useTeams } from '@/features/teams/hooks'
import { errorMessage } from '@/shared/lib/errors'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { LogoBadge } from '@/shared/ui/layout'
import { useAddTournamentTeam } from '../hooks'

/**
 * Заявка команд в дивизион пачкой: поиск по справочнику и галочки.
 * Ищет сервер — справочник общий для всех организаторов и целиком в один список не помещается.
 * Заявки отправляются по очереди; не прошедшие остаются отмеченными с причиной.
 */
export function RegisterTeamsForm({
  divisionId,
  registeredTeamIds,
  onDone,
}: {
  divisionId: string
  registeredTeamIds: Set<string>
  onDone: () => void
}) {
  const [query, setQuery] = useState('')
  const search = useDebouncedValue(query.trim())
  const found = useTeams(search)
  const addTeam = useAddTournamentTeam(divisionId)

  // Отмеченные команды с названиями: после смены запроса их может не быть в списке на экране.
  const [selected, setSelected] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState(false)
  const [failures, setFailures] = useState<string[]>([])

  const shown = (found.data ?? []).filter((team) => !registeredTeamIds.has(team.id))
  const truncated = (found.data?.length ?? 0) >= TEAMS_LIST_LIMIT

  const toggle = (teamId: string, name: string) =>
    setSelected((current) => {
      const next = new Map(current)
      if (next.has(teamId)) next.delete(teamId)
      else next.set(teamId, name)
      return next
    })

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setFailures([])

    const failed = new Map<string, string>()
    const errors: string[] = []
    // По очереди: так сервер видит заявки в предсказуемом порядке, а ошибки привязаны к команде.
    for (const [teamId, name] of selected) {
      try {
        await addTeam.mutateAsync(teamId)
      } catch (error) {
        failed.set(teamId, name)
        errors.push(`${name}: ${errorMessage(error)}`)
      }
    }

    setBusy(false)
    if (failed.size === 0) {
      onDone()
      return
    }
    setSelected(failed)
    setFailures(errors)
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <label className="search-field">
        <span className="visually-hidden">Поиск команды по названию</span>
        <Icon name="search" size={18} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Название команды"
          maxLength={150}
          autoFocus
        />
      </label>

      <ErrorText error={found.error} />

      {found.isPending ? (
        <p className="muted">Загрузка…</p>
      ) : shown.length === 0 ? (
        search ? (
          <p className="muted">
            Ничего не найдено. <Link to="/teams">Добавить команду в справочник</Link>
          </p>
        ) : (
          <p className="notice">
            Все команды из справочника уже заявлены. <Link to="/teams">Добавить новую команду</Link>
          </p>
        )
      ) : (
        <ul className="check-list">
          {shown.map((team) => (
            <li key={team.id}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={selected.has(team.id)}
                  onChange={() => toggle(team.id, team.name)}
                />
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

      {truncated && (
        <p className="hint">Показаны первые {TEAMS_LIST_LIMIT} команд — уточните название, чтобы найти остальные.</p>
      )}

      <p className="hint">
        Команда заявляется один раз и играет во всех этапах своего дивизиона. В турнире команда может быть только в
        одном дивизионе, игрок — только в одной команде.
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
