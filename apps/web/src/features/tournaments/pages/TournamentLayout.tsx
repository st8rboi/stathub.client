import { Outlet, useParams } from 'react-router'
import { formatDateRange } from '@/shared/lib/format'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Badge, Loading, PageHeader, Tabs } from '@/shared/ui/layout'
import { useChangeTournamentStatus, useTournament } from '../hooks'
import type { TournamentOutletContext } from '../tournamentOutlet'
import type { TournamentStatus } from '../types'

/** Путь турнира по статусам; отмена — отдельная ветка, в шагах её нет. */
const STEPS: { status: TournamentStatus; label: string }[] = [
  { status: 'Scheduled', label: 'Запланирован' },
  { status: 'Active', label: 'Идёт' },
  { status: 'Completed', label: 'Завершён' },
]

/**
 * Рамка страницы турнира: шапка с шагами статуса и кнопкой следующего шага, вкладки.
 * Содержимое вкладок — дочерние роуты, турнир передаётся им через Outlet context.
 */
export default function TournamentLayout() {
  const { leagueId = '', tournamentId = '' } = useParams()
  const tournament = useTournament(leagueId, tournamentId)
  const changeStatus = useChangeTournamentStatus(leagueId, tournamentId)
  const confirm = useConfirm()

  if (tournament.error) return <ErrorText error={tournament.error} />
  if (!tournament.data) return <Loading />

  const { data } = tournament
  const basePath = `/leagues/${leagueId}/tournaments/${tournamentId}`
  const cancelled = data.status === 'Cancelled'
  const currentStep = STEPS.findIndex((step) => step.status === data.status)

  const start = () =>
    void confirm({
      title: 'Начать турнир?',
      message: 'После старта правила этапов (формат, очки, регламент) менять будет нельзя, новые этапы — добавлять тоже.',
      confirmLabel: 'Начать турнир',
    }).then((ok) => {
      if (ok) changeStatus.mutate('start')
    })

  const complete = () =>
    void confirm({
      title: 'Завершить турнир?',
      message: 'Турнир получит статус «Завершён».',
      confirmLabel: 'Завершить',
    }).then((ok) => {
      if (ok) changeStatus.mutate('complete')
    })

  return (
    <>
      <PageHeader
        eyebrow="Турнир"
        title={data.name}
        meta={
          <>
            {cancelled && <Badge tone="danger">Отменён</Badge>}
            <span>{formatDateRange(data.startDate, data.endDate)}</span>
          </>
        }
        actions={
          <>
            {data.status === 'Scheduled' && (
              <button type="button" disabled={changeStatus.isPending} onClick={start}>
                Начать турнир
              </button>
            )}
            {data.status === 'Active' && (
              <button type="button" disabled={changeStatus.isPending} onClick={complete}>
                Завершить турнир
              </button>
            )}
          </>
        }
      />

      {!cancelled && (
        <ol className="steps" aria-label="Статус турнира">
          {STEPS.map((step, index) => {
            const done = index < currentStep || data.status === 'Completed'
            const current = index === currentStep && data.status !== 'Completed'
            return (
              <li
                key={step.status}
                className={done ? 'step step--done' : current ? 'step step--current' : 'step'}
                aria-current={current ? 'step' : undefined}
              >
                <span className="step-dot">{done ? <Icon name="check" size={14} /> : index + 1}</span>
                {step.label}
              </li>
            )
          })}
        </ol>
      )}
      <ErrorText error={changeStatus.error} />

      <Tabs
        label="Разделы турнира"
        items={[
          { to: basePath, label: 'Этапы', end: true, count: data.stages.length },
          { to: `${basePath}/fees`, label: 'Взносы' },
          { to: `${basePath}/discipline`, label: 'Дисциплина' },
          { to: `${basePath}/settings`, label: 'Настройки' },
        ]}
      />

      <Outlet context={{ tournament: data } satisfies TournamentOutletContext} />
    </>
  )
}
