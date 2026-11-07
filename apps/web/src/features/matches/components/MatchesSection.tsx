import { useTournamentTeams } from '@/features/rosters/hooks'
import { RefereeAssign } from '@/features/accounts/components/RefereeAssign'
import { useTeams } from '@/features/teams/hooks'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useState, type SubmitEvent } from 'react'
import { useCreateMatch, useDeleteMatch, useStageMatches, useUpdateMatch } from '../hooks'
import { matchStatusLabels } from '../labels'

/** Дата в формате datetime-local (местное время). */
function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Значение по умолчанию для datetime-local: ближайший час. */
function defaultStartValue(): string {
  return toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000))
}

interface MatchDraft {
  id: string
  homeTeamId: string
  awayTeamId: string
  start: string
}

/**
 * Матчи этапа и создание нового. В выпадающих списках — только команды, заявленные
 * на этот турнир: так матч нельзя случайно создать с командой, которой в сезоне нет.
 */
export function MatchesSection({ stageId }: { stageId: string }) {
  const matches = useStageMatches(stageId)
  const allTeams = useTeams()
  // Команды берём из заявок этого этапа: в дивизионе играют только его участники.
  const tournamentTeams = useTournamentTeams(stageId)
  const create = useCreateMatch(stageId)
  const update = useUpdateMatch(stageId)
  const remove = useDeleteMatch(stageId)

  const [formError, setFormError] = useState<string | null>(null)
  // Матч, который правится прямо в таблице (одна строка за раз).
  const [draft, setDraft] = useState<MatchDraft | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)

  const teamName = (teamId: string) => allTeams.data?.find((team) => team.id === teamId)?.name ?? teamId.slice(0, 8)

  const registeredTeamIds = new Set(
    (tournamentTeams.data ?? [])
      .filter((tournamentTeam) => tournamentTeam.status === 'Active')
      .map((tournamentTeam) => tournamentTeam.teamId),
  )

  const teamOptions = (allTeams.data ?? []).filter((team) => registeredTeamIds.has(team.id))
  const noRegisteredTeams = tournamentTeams.data?.length === 0

  const saveDraft = () => {
    if (!draft) return
    if (draft.homeTeamId === draft.awayTeamId) {
      setDraftError('Команды должны быть разными.')
      return
    }
    if (!draft.start) {
      setDraftError('Укажите дату и время начала.')
      return
    }

    setDraftError(null)
    update.mutate(
      {
        id: draft.id,
        body: {
          homeTeamId: draft.homeTeamId,
          awayTeamId: draft.awayTeamId,
          startTimeUtc: new Date(draft.start).toISOString(),
        },
      },
      { onSuccess: () => setDraft(null) },
    )
  }

  const teamSelect = (value: string, onChange: (teamId: string) => void, label: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {/* Текущая команда могла быть снята с этапа — оставляем её в списке, чтобы не потерять выбор. */}
      {!teamOptions.some((team) => team.id === value) && <option value={value}>{teamName(value)}</option>}
      {teamOptions.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  )

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formElement = e.currentTarget
    const form = new FormData(formElement)

    const homeTeamId = String(form.get('homeTeamId') ?? '')
    const awayTeamId = String(form.get('awayTeamId') ?? '')
    const start = String(form.get('start') ?? '')

    if (!homeTeamId || !awayTeamId) {
      setFormError('Выберите обе команды.')
      return
    }
    if (homeTeamId === awayTeamId) {
      setFormError('Команды должны быть разными.')
      return
    }
    if (!start) {
      setFormError('Укажите дату и время начала.')
      return
    }

    setFormError(null)
    create.mutate(
      {
        stageId,
        homeTeamId,
        awayTeamId,
        // datetime-local отдаёт локальное время — на сервер уходит UTC.
        startTimeUtc: new Date(start).toISOString(),
      },
      { onSuccess: () => formElement.reset() },
    )
  }

  return (
    <>
      <ErrorText error={matches.error} />
      {matches.isPending && <p>Загрузка…</p>}
      {matches.data?.length === 0 && <p className="notice">Матчей на этом этапе пока нет.</p>}
      {matches.data && matches.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Начало</th>
              <th>Команды</th>
              <th>Счёт</th>
              <th>Статус</th>
              <th>Судья</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {matches.data.map((match) => {
              const isEditing = draft?.id === match.id
              // Правка и удаление — только у не начатого матча (сервер ещё проверит, что нет событий).
              const editable = match.status === 'Scheduled' || match.status === 'Cancelled'

              return (
                <tr key={match.id}>
                  {isEditing ? (
                    <>
                      <td>
                        <input
                          type="datetime-local"
                          value={draft.start}
                          onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                          aria-label="Начало матча"
                        />
                      </td>
                      <td>
                        <div className="actions">
                          {teamSelect(draft.homeTeamId, (homeTeamId) => setDraft({ ...draft, homeTeamId }), 'Хозяева')}
                          {teamSelect(draft.awayTeamId, (awayTeamId) => setDraft({ ...draft, awayTeamId }), 'Гости')}
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{new Date(match.scheduledTimeUtc).toLocaleString('ru-RU')}</td>
                      <td>
                        {teamName(match.homeTeamId)} — {teamName(match.awayTeamId)}
                      </td>
                    </>
                  )}
                  <td>
                    {match.homeScore} : {match.awayScore}
                  </td>
                  <td>
                    {matchStatusLabels[match.status]}
                    {match.eventsForReview > 0 && <p className="error">На разборе событий: {match.eventsForReview}</p>}
                  </td>
                  <td>
                    <RefereeAssign matchId={match.id} />
                  </td>
                  <td className="actions-cell">
                    {isEditing ? (
                      <div className="actions">
                        <button type="button" disabled={update.isPending} onClick={saveDraft}>
                          Сохранить
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            setDraft(null)
                            setDraftError(null)
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      editable && (
                        <div className="actions">
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => {
                              update.reset()
                              setDraftError(null)
                              setDraft({
                                id: match.id,
                                homeTeamId: match.homeTeamId,
                                awayTeamId: match.awayTeamId,
                                start: toLocalInputValue(new Date(match.scheduledTimeUtc)),
                              })
                            }}
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="danger"
                            disabled={remove.isPending}
                            onClick={() => {
                              // Сервер откажет (409), если по матчу есть события или оплаченный взнос.
                              if (
                                confirm(
                                  `Удалить матч ${teamName(match.homeTeamId)} — ${teamName(match.awayTeamId)}? ` +
                                    'Неоплаченные взносы по нему удалятся, назначения судей будут отозваны.',
                                )
                              ) {
                                remove.mutate(match.id)
                              }
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      )
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {draftError && <p className="error">{draftError}</p>}
      <ErrorText error={update.error ?? remove.error} />

      <h2>Новый матч</h2>
      {noRegisteredTeams ? (
        <p className="notice">
          На этом этапе нет заявленных команд. Заявите их в блоке «Участники этапа» выше — матч создаётся только между
          участниками этого дивизиона.
        </p>
      ) : (
        <form onSubmit={onSubmit}>
          <label>
            Хозяева
            <select name="homeTeamId" required defaultValue="">
              <option value="" disabled>
                Выберите команду
              </option>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Гости
            <select name="awayTeamId" required defaultValue="">
              <option value="" disabled>
                Выберите команду
              </option>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Начало (местное время)
            <input name="start" type="datetime-local" required defaultValue={defaultStartValue()} />
          </label>
          {formError && <p className="error">{formError}</p>}
          <ErrorText error={create.error} />
          <button type="submit" disabled={create.isPending}>
            Создать матч
          </button>
          <p className="hint">
            Регламент (периоды, доп. время, пенальти) сервер снимает с правил этапа при создании матча.
          </p>
        </form>
      )}
    </>
  )
}
