import { useState } from 'react'
import { Link } from 'react-router'
import { RefereeAssign, StatisticianAssign } from '@/features/accounts/components/RefereeAssign'
import { useAssignments } from '@/features/accounts/hooks'
import { useTournamentTeams } from '@/features/rosters/hooks'
import { useTeamsByIds } from '@/features/teams/hooks'
import { useStageOutlet } from '@/features/tournaments/stageOutlet'
import { dayKey, formatDayHeading, formatTime, plural, toLocalInputValue } from '@/shared/lib/format'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Badge, EmptyState, Loading } from '@/shared/ui/layout'
import { Menu, MenuButton } from '@/shared/ui/Menu'
import { Modal } from '@/shared/ui/Modal'
import { MatchForm, type MatchFormValues } from '../components/MatchForm'
import { useCreateMatch, useDeleteMatch, useStageMatches, useUpdateMatch } from '../hooks'
import { matchStatusLabels, matchStatusTones } from '../labels'
import type { Match, MatchStatus } from '../types'

type Filter = 'upcoming' | 'finished' | 'attention' | 'all'

const UPCOMING_STATUSES: MatchStatus[] = ['Scheduled', 'InProgress', 'Pause']
const LIVE_STATUSES: MatchStatus[] = ['InProgress', 'Pause']

const isUpcoming = (match: Match) => UPCOMING_STATUSES.includes(match.status)
/** Править и удалять можно только не начатый матч (сервер ещё проверит, что нет событий). */
const isEditable = (match: Match) => match.status === 'Scheduled' || match.status === 'Cancelled'

/** Время начала по умолчанию — ближайший час. */
const defaultStart = () => toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000))

/** Вкладка «Матчи» этапа: расписание по дням, фильтры, создание и правка в боковой панели. */
export default function StageMatchesPage() {
  const { stage, basePath } = useStageOutlet()
  const confirm = useConfirm()

  const matches = useStageMatches(stage.id)
  // Команды берём из заявок этапа: в дивизионе играют только его участники.
  const stageTeams = useTournamentTeams(stage.id)
  // Названия — по Id участников и команд матчей (команду могли снять, а матч остался).
  const allTeams = useTeamsByIds([
    ...(stageTeams.data ?? []).map((team) => team.teamId),
    ...(matches.data ?? []).flatMap((match) => [match.homeTeamId, match.awayTeamId]),
  ])
  const assignments = useAssignments()

  const create = useCreateMatch(stage.id)
  const update = useUpdateMatch(stage.id)
  const remove = useDeleteMatch(stage.id)

  const [filter, setFilter] = useState<Filter | null>(null)
  const [creating, setCreating] = useState(false)
  // Серия «Создать и ещё»: ключ пересоздаёт форму, время начала переносится в следующий матч.
  const [createSeq, setCreateSeq] = useState(0)
  const [nextStart, setNextStart] = useState<string | null>(null)
  const [createdNotice, setCreatedNotice] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const teamName = (teamId: string) => allTeams.data?.find((team) => team.id === teamId)?.name ?? '…'

  const activeTeamIds = new Set(
    (stageTeams.data ?? []).filter((team) => team.status === 'Active').map((team) => team.teamId),
  )
  const teamOptions = (allTeams.data ?? [])
    .filter((team) => activeTeamIds.has(team.id))
    .map((team) => ({ id: team.id, name: team.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const noTeams = stageTeams.data !== undefined && activeTeamIds.size === 0

  // Без доступа к назначениям (ошибка) не считаем «нет судьи» проблемой — мы этого просто не знаем.
  const refereeMatchIds = assignments.data
    ? new Set(
        assignments.data.filter((a) => a.scopeType === 'Match' && a.role === 'Referee').map((a) => a.scopeId),
      )
    : null
  const needsReferee = (match: Match) =>
    match.status === 'Scheduled' && refereeMatchIds !== null && !refereeMatchIds.has(match.id)
  const needsAttention = (match: Match) => match.eventsForReview > 0 || needsReferee(match)

  const list = matches.data ?? []
  const counts: Record<Filter, number> = {
    upcoming: list.filter(isUpcoming).length,
    finished: list.filter((match) => !isUpcoming(match)).length,
    attention: list.filter(needsAttention).length,
    all: list.length,
  }
  // Пока фильтр не выбран руками: есть предстоящие — показываем их, иначе всё.
  const activeFilter: Filter = filter ?? (counts.upcoming > 0 ? 'upcoming' : 'all')

  const visible = list
    .filter((match) =>
      activeFilter === 'upcoming'
        ? isUpcoming(match)
        : activeFilter === 'finished'
          ? !isUpcoming(match)
          : activeFilter === 'attention'
            ? needsAttention(match)
            : true,
    )
    .sort((a, b) =>
      activeFilter === 'finished'
        ? b.scheduledTimeUtc.localeCompare(a.scheduledTimeUtc)
        : a.scheduledTimeUtc.localeCompare(b.scheduledTimeUtc),
    )

  const days = new Map<string, Match[]>()
  for (const match of visible) {
    const key = dayKey(match.scheduledTimeUtc)
    days.set(key, [...(days.get(key) ?? []), match])
  }

  const openCreate = () => {
    create.reset()
    setCreatedNotice(null)
    setNextStart(null)
    setCreateSeq((value) => value + 1)
    setCreating(true)
  }

  const submitCreate = (values: MatchFormValues, again: boolean) =>
    create.mutate(
      {
        stageId: stage.id,
        homeTeamId: values.homeTeamId,
        awayTeamId: values.awayTeamId,
        // datetime-local отдаёт местное время — на сервер уходит UTC.
        startTimeUtc: new Date(values.start).toISOString(),
      },
      {
        onSuccess: () => {
          if (!again) {
            setCreating(false)
            return
          }
          setCreatedNotice(`Матч ${teamName(values.homeTeamId)} — ${teamName(values.awayTeamId)} создан.`)
          setNextStart(values.start)
          setCreateSeq((value) => value + 1)
        },
      },
    )

  const editing = list.find((match) => match.id === editingId)
  // Текущие команды матча могли быть сняты с этапа — оставляем их в списке, чтобы не потерять выбор.
  const editOptions = editing
    ? [
        ...[editing.homeTeamId, editing.awayTeamId]
          .filter((id) => !teamOptions.some((team) => team.id === id))
          .map((id) => ({ id, name: teamName(id) })),
        ...teamOptions,
      ]
    : teamOptions

  const askDelete = (match: Match) =>
    void confirm({
      title: `Удалить матч ${teamName(match.homeTeamId)} — ${teamName(match.awayTeamId)}?`,
      message: 'Неоплаченные взносы по нему удалятся, назначения судей будут отозваны.',
      confirmLabel: 'Удалить матч',
      danger: true,
    }).then((ok) => {
      // Сервер откажет (409), если по матчу есть события или оплаченный взнос.
      if (ok) remove.mutate(match.id)
    })

  const filters: { id: Filter; label: string }[] = [
    { id: 'upcoming', label: 'Предстоящие' },
    { id: 'finished', label: 'Сыгранные' },
    { id: 'attention', label: 'Требуют внимания' },
    { id: 'all', label: 'Все' },
  ]

  return (
    <>
      <ErrorText error={matches.error ?? remove.error} />
      {matches.isPending && <Loading />}

      {matches.data?.length === 0 &&
        (noTeams ? (
          <EmptyState
            icon="shield"
            title="Сначала заявите команды"
            action={<Link to={`${basePath}/teams`}>Перейти к участникам</Link>}
          >
            Матч создаётся только между участниками этого этапа.
          </EmptyState>
        ) : (
          <EmptyState
            icon="layers"
            title="Матчей пока нет"
            action={
              <button type="button" onClick={openCreate}>
                <Icon name="plus" size={18} />
                Новый матч
              </button>
            }
          >
            Составьте расписание: команды, дата и время. Судью можно назначить сразу в списке.
          </EmptyState>
        ))}

      {list.length > 0 && (
        <>
          <div className="toolbar">
            <div className="chips" role="group" aria-label="Фильтр матчей">
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === 'attention' && counts.attention > 0 ? 'chip chip--alert' : 'chip'}
                  aria-pressed={activeFilter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                  <span className="chip-count">{counts[item.id]}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={openCreate} disabled={noTeams}>
              <Icon name="plus" size={18} />
              Новый матч
            </button>
          </div>

          {visible.length === 0 && (
            <p className="muted">
              {activeFilter === 'attention' ? 'Всё в порядке: у матчей есть судьи, разбирать нечего.' : 'Матчей нет.'}
            </p>
          )}

          {[...days.entries()].map(([key, dayMatches]) => (
            <section key={key} className="match-day">
              <h2 className="group-title">
                {formatDayHeading(dayMatches[0].scheduledTimeUtc)} · {plural(dayMatches.length, ['матч', 'матча', 'матчей'])}
              </h2>
              <ul className="match-list">
                {dayMatches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    teamName={teamName}
                    needsReferee={needsReferee(match)}
                    onEdit={() => {
                      update.reset()
                      setEditingId(match.id)
                    }}
                    onDelete={() => askDelete(match)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый матч" variant="drawer">
        {noTeams ? (
          <p className="notice">
            На этапе нет заявленных команд. <Link to={`${basePath}/teams`}>Заявите их</Link> — матч создаётся только
            между участниками этапа.
          </p>
        ) : (
          <MatchForm
            key={createSeq}
            teams={teamOptions}
            initial={{ homeTeamId: '', awayTeamId: '', start: nextStart ?? defaultStart() }}
            submitLabel="Создать матч"
            pending={create.isPending}
            error={create.error}
            onSubmit={submitCreate}
            onCancel={() => setCreating(false)}
            allowAgain
            notice={createdNotice}
          />
        )}
      </Modal>

      <Modal open={editing !== undefined} onClose={() => setEditingId(null)} title="Матч" variant="drawer">
        {editing && (
          <MatchForm
            key={editing.id}
            teams={editOptions}
            initial={{
              homeTeamId: editing.homeTeamId,
              awayTeamId: editing.awayTeamId,
              start: toLocalInputValue(new Date(editing.scheduledTimeUtc)),
            }}
            submitLabel="Сохранить"
            pending={update.isPending}
            error={update.error}
            onSubmit={(values) =>
              update.mutate(
                {
                  id: editing.id,
                  body: {
                    homeTeamId: values.homeTeamId,
                    awayTeamId: values.awayTeamId,
                    startTimeUtc: new Date(values.start).toISOString(),
                  },
                },
                { onSuccess: () => setEditingId(null) },
              )
            }
            onCancel={() => setEditingId(null)}
          />
        )}
      </Modal>
    </>
  )
}

function MatchRow({
  match,
  teamName,
  needsReferee,
  onEdit,
  onDelete,
}: {
  match: Match
  teamName: (teamId: string) => string
  needsReferee: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const live = LIVE_STATUSES.includes(match.status)
  const notStarted = match.status === 'Scheduled' || match.status === 'Cancelled'
  const home = teamName(match.homeTeamId)
  const away = teamName(match.awayTeamId)

  return (
    <li className="match-row" aria-label={`${home} — ${away}, ${formatTime(match.scheduledTimeUtc)}`}>
      <span className="match-time">{formatTime(match.scheduledTimeUtc)}</span>

      <span className="match-teams">
        <span className="match-team match-team--home" title={home}>
          {home}
        </span>
        <span
          className={notStarted ? 'match-score match-score--empty' : live ? 'match-score match-score--live' : 'match-score'}
        >
          {notStarted ? '–:–' : `${match.homeScore}:${match.awayScore}`}
        </span>
        <span className="match-team" title={away}>
          {away}
        </span>
      </span>

      <span className="match-status">
        {match.status !== 'Scheduled' && (
          <Badge tone={matchStatusTones[match.status]}>{matchStatusLabels[match.status]}</Badge>
        )}
        {match.eventsForReview > 0 && <Badge tone="warning">На разборе: {match.eventsForReview}</Badge>}
      </span>

      <span className="match-referee" title={needsReferee ? 'Судья не назначен' : undefined}>
        <RefereeAssign matchId={match.id} />
        <StatisticianAssign matchId={match.id} />
      </span>

      <span className="match-actions">
        {isEditable(match) && (
          <Menu triggerClassName="icon-button" triggerLabel={`Действия с матчем ${home} — ${away}`} trigger={<Icon name="more" />} align="end">
            <MenuButton onClick={onEdit}>Изменить</MenuButton>
            <MenuButton danger onClick={onDelete}>
              Удалить
            </MenuButton>
          </Menu>
        )}
      </span>
    </li>
  )
}
