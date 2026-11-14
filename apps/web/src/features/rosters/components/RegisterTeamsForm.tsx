import { useQueryClient } from '@tanstack/react-query'
import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import { TEAMS_LIST_LIMIT } from '@/features/teams/api'
import { useTeams } from '@/features/teams/hooks'
import { errorMessage } from '@/shared/lib/errors'
import { plural } from '@/shared/lib/format'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { LogoBadge } from '@/shared/ui/layout'
import { rosterSourcesQuery, useAddTournamentTeam, useRosterSources } from '../hooks'

const playersForms: [string, string, string] = ['игрок', 'игрока', 'игроков']

/**
 * Заявка команд в дивизион пачкой: поиск по справочнику и галочки.
 * Ищет сервер — справочник общий для всех организаторов и целиком в один список не помещается.
 * Для каждой отмеченной команды можно выбрать состав — копию её заявки в другом турнире
 * (по умолчанию самой свежей). Заявки отправляются по очереди; не прошедшие остаются отмеченными с причиной.
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
  const queryClient = useQueryClient()

  // Отмеченные команды с названиями: после смены запроса их может не быть в списке на экране.
  const [selected, setSelected] = useState<Map<string, string>>(new Map())
  // Явно выбранный состав: Id заявки-источника или '' — пустой. Нет записи — самая свежая заявка.
  const [copyChoice, setCopyChoice] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState(false)
  const [failures, setFailures] = useState<string[]>([])
  const [notes, setNotes] = useState<string[]>([])

  const shown = (found.data ?? []).filter((team) => !registeredTeamIds.has(team.id))
  const truncated = (found.data?.length ?? 0) >= TEAMS_LIST_LIMIT

  const toggle = (teamId: string, name: string) =>
    setSelected((current) => {
      const next = new Map(current)
      if (next.has(teamId)) next.delete(teamId)
      else next.set(teamId, name)
      return next
    })

  const chooseCopy = (teamId: string, sourceId: string) =>
    setCopyChoice((current) => new Map(current).set(teamId, sourceId))

  // Состав по умолчанию — самая свежая заявка; список уже в кэше, если строка выбора успела загрузиться.
  const resolveCopyFrom = async (teamId: string): Promise<string | null> => {
    const chosen = copyChoice.get(teamId)
    if (chosen !== undefined) return chosen || null
    const sources = await queryClient.fetchQuery(rosterSourcesQuery(divisionId, teamId))
    return sources[0]?.tournamentTeamId ?? null
  }

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setFailures([])
    setNotes([])

    const failed = new Map<string, string>()
    const errors: string[] = []
    const skippedNotes: string[] = []
    // По очереди: так сервер видит заявки в предсказуемом порядке, а ошибки привязаны к команде.
    for (const [teamId, name] of selected) {
      try {
        const result = await addTeam.mutateAsync({ teamId, copyFrom: await resolveCopyFrom(teamId) })
        const skipped = result.skippedPlayerIds.length
        if (skipped > 0) {
          skippedNotes.push(
            `${name}: скопировано ${result.copiedPlayers} ${plural(result.copiedPlayers, playersForms)}, ` +
              `${skipped} ${plural(skipped, playersForms)} не ${skipped === 1 ? 'перенесён' : 'перенесены'} — ` +
              'уже заявлены за другую команду турнира (оформите трансфер).',
          )
        }
      } catch (error) {
        failed.set(teamId, name)
        errors.push(`${name}: ${errorMessage(error)}`)
      }
    }

    setBusy(false)
    if (failed.size === 0 && skippedNotes.length === 0) {
      onDone()
      return
    }
    setSelected(failed)
    setFailures(errors)
    setNotes(skippedNotes)
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

      {selected.size > 0 && (
        <ul className="check-list">
          {[...selected].map(([teamId, name]) => (
            <li key={teamId}>
              <RosterSourcePicker
                divisionId={divisionId}
                teamId={teamId}
                teamName={name}
                value={copyChoice.get(teamId)}
                onChange={(sourceId) => chooseCopy(teamId, sourceId)}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="hint">
        Команда заявляется один раз и играет во всех этапах своего дивизиона. В турнире команда может быть только в
        одном дивизионе, игрок — только в одной команде. При копировании состава переносятся игроки, заявленные в
        выбранном турнире на момент его окончания (или сейчас).
      </p>

      {notes.map((note) => (
        <p key={note} className="notice">
          {note}
        </p>
      ))}

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
          {notes.length > 0 && selected.size === 0 ? 'Готово' : 'Отмена'}
        </button>
      </div>
    </form>
  )
}

/**
 * Выбор состава для отмеченной команды: пустой или копия её заявки в другом турнире.
 * Пока пользователь ничего не выбрал, показана самая свежая заявка — она же уйдёт на сервер.
 */
function RosterSourcePicker({
  divisionId,
  teamId,
  teamName,
  value,
  onChange,
}: {
  divisionId: string
  teamId: string
  teamName: string
  value: string | undefined
  onChange: (sourceId: string) => void
}) {
  const sources = useRosterSources(divisionId, teamId)
  const list = sources.data ?? []

  if (sources.isPending) return <p className="muted">{teamName}: загрузка прошлых заявок…</p>
  if (sources.error) return <ErrorText error={sources.error} />
  if (list.length === 0) return <p className="muted">{teamName}: прошлых заявок нет — состав будет пустым.</p>

  return (
    <label>
      Состав «{teamName}»
      <select value={value ?? list[0].tournamentTeamId} onChange={(event) => onChange(event.target.value)}>
        {list.map((source) => (
          <option key={source.tournamentTeamId} value={source.tournamentTeamId}>
            {source.tournamentName} · {source.divisionName} ({source.leagueName}) — {source.activePlayers}{' '}
            {plural(source.activePlayers, playersForms)}
          </option>
        ))}
        <option value="">Пустой — заявить игроков вручную</option>
      </select>
    </label>
  )
}
