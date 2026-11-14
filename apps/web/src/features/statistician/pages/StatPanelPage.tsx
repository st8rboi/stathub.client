import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { matchStatusLabels, matchStatusTones } from '@/features/matches/labels'
import { plural } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Badge, Loading } from '@/shared/ui/layout'
import { Modal } from '@/shared/ui/Modal'
import { statisticianApi, statisticianKeys } from '../api'
import { StatIcon } from '../StatIcon'
import {
  computeStats,
  dangerLevels,
  formatXg,
  isShotType,
  isStatType,
  statButtons,
  statLabels,
} from '../statistics'
import type { AssignedMatch, StatType } from '../types'
import { useStatQueue } from '../useStatQueue'

/** Ключ по матчу: при переходе между матчами очередь и счётчики создаются заново. */
export default function StatPanelPage() {
  const { matchId = '' } = useParams()
  return <StatPanel key={matchId} matchId={matchId} />
}

/**
 * Панель статистика — по образцу пульта судьи: сверху команды и счёт, ниже два столбца
 * кнопок (хозяева слева, гости справа). Нажатие = +1 к счётчику на кнопке; статусом матча,
 * голами и карточками управляет только судья.
 */
function StatPanel({ matchId }: { matchId: string }) {
  // Счёт и статус меняет судья — подтягиваем их опросом; свои нажатия видны сразу из очереди.
  const stateQuery = useQuery({
    queryKey: statisticianKeys.state(matchId),
    queryFn: () => statisticianApi.state(matchId),
    refetchInterval: 5_000,
  })

  // Названия команд — из списка назначенных матчей (в состоянии матча только Id).
  const assigned = useQuery({ queryKey: statisticianKeys.matches(), queryFn: statisticianApi.myMatches })
  const info: AssignedMatch | undefined = assigned.data?.find((item) => item.id === matchId)

  const queue = useStatQueue(matchId, stateQuery.data)

  // Удар ждёт выбора опасности: без xG сервер его не примет.
  const [shot, setShot] = useState<{ type: StatType; teamId: string } | null>(null)

  if (!stateQuery.data) {
    return (
      <>
        <BackLink />
        {stateQuery.isPending ? <Loading label="Загружаем матч…" /> : <ErrorText error={stateQuery.error} />}
      </>
    )
  }

  const { match } = stateQuery.data
  const stats = computeStats(match, queue.merged)
  const locked = match.status === 'Finished' || match.status === 'Cancelled'

  const homeName = info?.homeTeamName ?? 'Хозяева'
  const awayName = info?.awayTeamName ?? 'Гости'
  const teamName = (teamId: string | null) => (teamId === match.homeTeamId ? homeName : awayName)

  const lastAction = queue.lastAction
  const lastLabel =
    lastAction && isStatType(lastAction.type)
      ? [
          statLabels[lastAction.type],
          lastAction.expectedGoals !== null ? `xG ${formatXg(lastAction.expectedGoals)}` : null,
          teamName(lastAction.teamId),
        ]
          .filter(Boolean)
          .join(' · ')
      : null

  const syncText = queue.problem
    ? queue.problem
    : queue.pending.length > 0
      ? `Отправляем: ${plural(queue.pending.length, ['нажатие', 'нажатия', 'нажатий'])}`
      : 'Все нажатия сохранены на сервере.'

  return (
    <>
      <BackLink />

      {queue.rejected.map(({ event, reason }) => (
        <div key={event.id} className="stat-alert" role="alert">
          <span>
            <strong>
              Сервер не принял: {isStatType(event.type) ? statLabels[event.type] : 'отмену'}
              {event.teamId ? ` · ${teamName(event.teamId)}` : ''}.
            </strong>{' '}
            {reason}
          </span>
          <button type="button" className="secondary" onClick={() => queue.dismissRejected(event.id)}>
            Понятно
          </button>
        </div>
      ))}

      <section className="stat-board" aria-label="Матч">
        <div className="stat-board-status">
          <Badge tone={matchStatusTones[match.status]}>{matchStatusLabels[match.status]}</Badge>
          {match.currentPeriod > 0 && !locked && (
            <span className="hint">
              Период {match.currentPeriod} из {match.periodsCount}
            </span>
          )}
        </div>
        <div className="stat-board-teams">
          <span className="stat-board-team">{homeName}</span>
          <span className="stat-board-score">
            {match.homeScore} : {match.awayScore}
          </span>
          <span className="stat-board-team stat-board-team--away">{awayName}</span>
        </div>
        <div className="stat-board-xg" aria-label="Ожидаемые голы">
          <span>{formatXg(stats.home.expectedGoals)}</span>
          <span className="stat-board-xg-label">xG</span>
          <span>{formatXg(stats.away.expectedGoals)}</span>
        </div>
        {match.status === 'Scheduled' && (
          <p className="hint stat-board-note">Судья ещё не начал матч. Отмечать можно — нажатия войдут в статистику.</p>
        )}
        {locked && (
          <p className="hint stat-board-note">
            {match.status === 'Finished' ? 'Матч завершён' : 'Матч отменён'} — статистика закрыта.
          </p>
        )}
      </section>

      <section className="stat-pad" aria-label="Счётчики">
        {statButtons.map((button) => (
          <div key={button.type} className="stat-pad-row">
            {(['home', 'away'] as const).map((side) => {
              const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
              const count = stats[side][button.key]

              return (
                <button
                  key={side}
                  type="button"
                  className={`stat-button stat-button--${side}`}
                  disabled={locked}
                  aria-label={`${button.label} — ${side === 'home' ? homeName : awayName}: ${count}`}
                  onClick={() =>
                    isShotType(button.type)
                      ? setShot({ type: button.type, teamId })
                      : queue.record(button.type, teamId)
                  }
                >
                  <span className="stat-button-label">
                    <StatIcon type={button.type} />
                    {button.label}
                  </span>
                  <span className="stat-button-count">{count}</span>
                </button>
              )
            })}
          </div>
        ))}
      </section>

      <div className="stat-footer">
        <button type="button" className="secondary" disabled={!lastAction || locked} onClick={queue.undo}>
          Отменить последнее
        </button>
        <span className="hint">{lastLabel ? `Последнее: ${lastLabel}` : 'Отменять пока нечего'}</span>
      </div>

      <p className={queue.problem ? 'stat-sync stat-sync--problem' : 'stat-sync'} aria-live="polite">
        {syncText}
      </p>
      <p className="hint">«Удар» — все удары команды, включая удары в створ: «В створ» прибавляет к обоим счётчикам.</p>

      <Modal
        open={shot !== null}
        onClose={() => setShot(null)}
        title={shot ? `${statLabels[shot.type]} · ${teamName(shot.teamId)}` : ''}
        size="sm"
      >
        <p className="hint">Насколько опасным был момент?</p>
        <div className="danger-list">
          {dangerLevels.map((level, index) => (
            <button
              key={level.xg}
              type="button"
              className={`danger-option danger-option--${index + 1}`}
              onClick={() => {
                if (!shot) return
                queue.record(shot.type, shot.teamId, level.xg)
                setShot(null)
              }}
            >
              <span>{level.label}</span>
              <span className="danger-option-xg">{formatXg(level.xg)}</span>
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}

function BackLink() {
  return (
    <Link to="/stats" className="stat-back">
      ← Мои матчи
    </Link>
  )
}
