import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { usePlayersByIds } from '@/features/players/hooks'
import { useTournamentTeam, useTournamentTeams } from '@/features/rosters/hooks'
import { useTeamsByIds } from '@/features/teams/hooks'
import { createEventId } from '@/shared/lib/eventId'
import { formatDayHeading, formatTime } from '@/shared/lib/format'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Badge, Card, EmptyState, Loading, PageHeader } from '@/shared/ui/layout'
import { Menu, MenuButton } from '@/shared/ui/Menu'
import { Modal } from '@/shared/ui/Modal'
import { ProtocolEventForm, type ProtocolEventValues, type RosterOption } from '../components/ProtocolEventForm'
import { useAppendProtocolEvents, useCancelMatch, useMatchState } from '../hooks'
import { matchStatusLabels, matchStatusTones } from '../labels'
import {
  choiceToEvent,
  clockMarks,
  displayMinute,
  eventLabel,
  isLifecycle,
  isStatistic,
  startedPeriods,
  timeForMinute,
} from '../protocol'
import type { NewProtocolEvent, ProtocolEvent } from '../types'

/**
 * Протокол матча для организатора: просмотр событий с пометками «на разборе», добавление
 * и отмена событий — в том числе после финального свистка (исправление протокола), и отмена
 * матча, начатого по ошибке. Статус матча отсюда не меняется: его ведёт судья.
 */
export default function MatchProtocolPage() {
  const confirm = useConfirm()
  const { leagueId = '', tournamentId = '', stageId = '', matchId = '' } = useParams()
  const stagePath = `/leagues/${leagueId}/tournaments/${tournamentId}/stages/${stageId}`

  const state = useMatchState(matchId)
  const append = useAppendProtocolEvents(stageId, matchId)
  const cancel = useCancelMatch(stageId)

  const match = state.data?.match
  const events = state.data?.events ?? []

  // Составы обеих команд с историей: судья мог записать отзаявленного игрока.
  const stageTeams = useTournamentTeams(stageId)
  const entryOf = (teamId: string | undefined) => stageTeams.data?.find((entry) => entry.teamId === teamId)?.id ?? ''
  const homeRoster = useTournamentTeam(stageId, entryOf(match?.homeTeamId))
  const awayRoster = useTournamentTeam(stageId, entryOf(match?.awayTeamId))
  const registrations = [...(homeRoster.data?.registrations ?? []), ...(awayRoster.data?.registrations ?? [])]

  const teams = useTeamsByIds(match ? [match.homeTeamId, match.awayTeamId] : [])
  const players = usePlayersByIds([
    ...new Set([
      ...registrations.map((registration) => registration.playerId),
      ...events.flatMap((event) => [event.playerId, event.relatedPlayerId]).filter((id): id is string => Boolean(id)),
    ]),
  ])

  const [adding, setAdding] = useState(false)
  const [formSeq, setFormSeq] = useState(0)
  const [rejection, setRejection] = useState<string | null>(null)
  const [showStatistics, setShowStatistics] = useState(false)

  if (state.error) return <ErrorText error={state.error} />
  if (!match) return <Loading />

  const teamName = (teamId: string | null) =>
    teamId ? (teams.data?.find((team) => team.id === teamId)?.name ?? '…') : ''
  const playerName = (playerId: string | null) =>
    playerId ? (players.data?.find((player) => player.id === playerId)?.fullName ?? 'Неизвестный игрок') : ''

  const rosterOf = (teamId: string): RosterOption[] => {
    const roster = teamId === match.homeTeamId ? homeRoster.data : awayRoster.data
    return (roster?.registrations ?? [])
      .map((registration) => ({
        id: registration.playerId,
        name: playerName(registration.playerId),
        inactive: registration.status !== 'Active',
      }))
      .sort((a, b) => Number(a.inactive) - Number(b.inactive) || a.name.localeCompare(b.name, 'ru'))
  }

  const marks = clockMarks(events)
  const periods = startedPeriods(events)
  const isCancelled = match.status === 'Cancelled'
  const isFinished = match.status === 'Finished'
  // Голы и карточки до стартового свистка сервер не принимает; в отменённый матч — ничего.
  const canAdd = periods > 0 && !isCancelled
  const canVoid = !isCancelled

  const visible = events.filter(
    (event) => event.type !== 'EventVoided' && (showStatistics || !isStatistic(event.type)),
  )
  const statisticsCount = events.filter((event) => isStatistic(event.type)).length
  const nextSequence = () => Math.max(0, ...events.map((event) => event.sequenceNumber)) + 1

  const send = (event: Omit<NewProtocolEvent, 'id' | 'sequenceNumber'>, onAccepted?: () => void) => {
    const id = createEventId()
    setRejection(null)
    append.mutate([{ ...event, id, sequenceNumber: nextSequence() }], {
      onSuccess: (result) => {
        const rejected = result.rejectedEvents.find((item) => item.eventId === id)
        if (rejected) setRejection(rejected.reason)
        else onAccepted?.()
      },
    })
  }

  const openAdd = () => {
    append.reset()
    setRejection(null)
    setFormSeq((value) => value + 1)
    setAdding(true)
  }

  const lastMark = [...marks.values()].at(-1)
  const initial: ProtocolEventValues = {
    choice: 'Goal',
    teamId: '',
    playerId: '',
    relatedPlayerId: '',
    period: Math.max(1, Math.min(periods, match.currentPeriod || 1)),
    minute: lastMark ? displayMinute(lastMark) : 1,
    comment: '',
  }

  const submitAdd = (values: ProtocolEventValues) => {
    const at = timeForMinute(events, values.period, values.minute)
    if (!at) {
      setRejection('Этот тайм ещё не начинался.')
      return
    }

    const { type, goalKind } = choiceToEvent[values.choice]
    send(
      {
        type,
        goalKind,
        teamId: values.teamId,
        playerId: values.playerId || null,
        relatedPlayerId: values.relatedPlayerId || null,
        targetEventId: null,
        reason: values.comment.trim() || (isFinished ? 'Исправление протокола организатором' : null),
        // Не в будущее: сервер всё равно обрезал бы время до текущего.
        clientTimestampUtc: new Date(Math.min(at.getTime(), Date.now())).toISOString(),
      },
      () => setAdding(false),
    )
  }

  const askVoid = (event: ProtocolEvent) =>
    void confirm({
      title: `Отменить событие «${eventLabel(event)}»?`,
      message: isFinished
        ? 'Матч завершён: счёт, таблица и статистика пересчитаются. Событие останется в протоколе как отменённое.'
        : 'Событие останется в протоколе как отменённое и перестанет учитываться в счёте и статистике.',
      confirmLabel: 'Отменить событие',
      danger: true,
    }).then((ok) => {
      if (ok)
        send({
          type: 'EventVoided',
          goalKind: null,
          teamId: null,
          playerId: null,
          relatedPlayerId: null,
          targetEventId: event.id,
          reason: 'Отменено организатором',
          clientTimestampUtc: new Date().toISOString(),
        })
    })

  const askCancelMatch = () =>
    void confirm({
      title: 'Отменить матч?',
      message:
        'Для матча, который судья начал по ошибке или который не состоялся. Протокол сохранится, но матч уйдёт из live, таблицы и статистики, а новые события судьи приниматься не будут. Вернуть матч нельзя — настоящий матч создайте заново.',
      confirmLabel: 'Отменить матч',
      danger: true,
    }).then((ok) => {
      if (ok) cancel.mutate(match.id)
    })

  const minuteOf = (event: ProtocolEvent) => {
    const mark = marks.get(event.id)
    return mark ? `${mark.period > 1 ? `${mark.period}т ` : ''}${displayMinute(mark)}'` : formatTime(event.occurredAtUtc ?? event.clientTimestampUtc)
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to={stagePath}>
            ← Матчи этапа
          </Link>
        }
        title={`${teamName(match.homeTeamId)} ${isCancelled || match.status === 'Scheduled' ? '—' : `${match.homeScore}:${match.awayScore}`} ${teamName(match.awayTeamId)}`}
        meta={
          <>
            <Badge tone={matchStatusTones[match.status]}>{matchStatusLabels[match.status]}</Badge>
            <span>
              №{match.number} · {formatDayHeading(match.scheduledTimeUtc)}, {formatTime(match.scheduledTimeUtc)}
            </span>
            {match.eventsForReview > 0 && <Badge tone="warning">На разборе: {match.eventsForReview}</Badge>}
          </>
        }
        actions={
          <>
            <button type="button" onClick={openAdd} disabled={!canAdd}>
              <Icon name="plus" size={18} />
              Событие
            </button>
            {!isCancelled && (
              <Menu triggerClassName="icon-button" triggerLabel="Действия с матчем" trigger={<Icon name="more" />} align="end">
                <MenuButton danger disabled={cancel.isPending} onClick={askCancelMatch}>
                  Отменить матч
                </MenuButton>
              </Menu>
            )}
          </>
        }
      />

      <ErrorText error={cancel.error ?? (adding ? null : append.error)} />
      {!adding && rejection && <p className="error">Сервер не принял: {rejection}</p>}

      {isFinished && (
        <p className="notice">
          Матч завершён. Изменения здесь — исправление протокола: счёт, таблица и статистика пересчитаются сразу.
        </p>
      )}
      {isCancelled && <p className="notice">Матч отменён: протокол только для просмотра.</p>}
      {periods === 0 && !isCancelled && (
        <p className="notice">Матч ещё не начат — голы и карточки появятся после стартового свистка судьи.</p>
      )}

      {statisticsCount > 0 && (
        <div className="toolbar">
          <div className="chips" role="group" aria-label="Какие события показать">
            <button type="button" className="chip" aria-pressed={!showStatistics} onClick={() => setShowStatistics(false)}>
              Протокол
            </button>
            <button type="button" className="chip" aria-pressed={showStatistics} onClick={() => setShowStatistics(true)}>
              Со статистикой <span className="chip-count">{statisticsCount}</span>
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState icon="layers" title="Событий пока нет">
          Протокол ведёт судья с телефона. Здесь можно дописать пропущенное событие или отменить ошибочное.
        </EmptyState>
      ) : (
        <Card flush>
          <table className="data-table">
            <thead>
              <tr>
                <th>Мин.</th>
                <th>Событие</th>
                <th>Команда</th>
                <th>Игроки</th>
                <th>
                  <span className="visually-hidden">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((event) => {
                const lifecycle = isLifecycle(event.type)
                return (
                  <tr key={event.id} className={event.isVoided || lifecycle ? 'row-muted' : undefined}>
                    <td className="num">{minuteOf(event)}</td>
                    <td>
                      <div>
                        <strong className={event.isVoided ? 'event-voided' : undefined}>
                          {eventLabel(event)}
                        </strong>{' '}
                        {event.isVoided && <Badge>Отменено</Badge>}
                      </div>
                      {event.reviewNote && !event.isVoided && <div className="error">{event.reviewNote}</div>}
                      {event.reason && <div className="hint">{event.reason}</div>}
                    </td>
                    <td>{teamName(event.teamId)}</td>
                    <td>
                      {playerName(event.playerId)}
                      {event.relatedPlayerId && (
                        <div className="hint">
                          {event.type === 'Substitution' ? 'выходит: ' : 'ассистент: '}
                          {playerName(event.relatedPlayerId)}
                        </div>
                      )}
                    </td>
                    <td>
                      {canVoid && !lifecycle && !event.isVoided && (
                        <Menu
                          triggerClassName="icon-button"
                          triggerLabel={`Действия с событием ${eventLabel(event)}`}
                          trigger={<Icon name="more" />}
                          align="end"
                        >
                          <MenuButton danger disabled={append.isPending} onClick={() => askVoid(event)}>
                            Отменить событие
                          </MenuButton>
                        </Menu>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Событие протокола" variant="drawer">
        <ProtocolEventForm
          key={formSeq}
          teams={[
            { id: match.homeTeamId, name: teamName(match.homeTeamId) },
            { id: match.awayTeamId, name: teamName(match.awayTeamId) },
          ]}
          rosterOf={rosterOf}
          periods={Math.max(1, periods)}
          bonusGoalEnabled={match.bonusGoalEnabled}
          initial={initial}
          pending={append.isPending}
          error={append.error}
          rejection={rejection}
          onSubmit={submitAdd}
          onCancel={() => setAdding(false)}
        />
      </Modal>
    </>
  )
}
