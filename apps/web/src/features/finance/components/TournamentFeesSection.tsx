import { useState, type FormEvent } from 'react'
import { formatDate, formatMoney } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Badge, Card, EmptyState, Loading } from '@/shared/ui/layout'
import { Menu, MenuButton } from '@/shared/ui/Menu'
import { Modal } from '@/shared/ui/Modal'
import { useFeeSettings, useFeeSummary, useSetTournamentFee, useTeamDebts, useTournamentCharges } from '../hooks'
import { chargeKindLabels, chargeStatusLabels, chargeStatusTones, paymentMethodLabels } from '../labels'
import { ChargeActions } from './ChargeActions'
import { FinanceOverview, PaidBar } from './FinanceOverview'
import { ManualChargeForm } from './ManualChargeForm'

/**
 * Взносы турнира: сводка (собрано из начисленного, по видам), долг по командам,
 * разовые начисления (вступительные, штрафы) и тариф за матч.
 */
export function TournamentFeesSection({
  tournamentId,
  stages,
}: {
  tournamentId: string
  stages: { id: string; name: string }[]
}) {
  const settings = useFeeSettings(tournamentId)
  const summary = useFeeSummary(tournamentId)
  const debts = useTeamDebts(tournamentId)
  const [onlyDebt, setOnlyDebt] = useState(false)
  const charges = useTournamentCharges(tournamentId)
  const setFee = useSetTournamentFee()

  // null — окно закрыто; '' — открыто без выбранной команды.
  const [chargeTeamId, setChargeTeamId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmitFee = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const raw = Number(String(new FormData(event.currentTarget).get('amount') ?? '0'))

    if (!Number.isFinite(raw) || raw < 0) {
      setError('Сумма должна быть неотрицательным числом.')
      return
    }

    setError(null)
    setFee.mutate({ tournamentId, amount: Math.round(raw) })
  }

  const stageName = (stageId: string | null) =>
    stageId ? (stages.find((stage) => stage.id === stageId)?.name ?? 'этап') : 'весь турнир'

  const manual = (charges.data ?? [])
    .filter((charge) => charge.kind !== 'MatchFee')
    .filter((charge) => !onlyDebt || charge.status === 'Pending')

  const teamDebts = debts.data ?? []
  const debtors = teamDebts.filter((debt) => debt.debt > 0).length

  return (
    <>
      <div className="toolbar">
        <p className="muted">
          {debtors > 0 ? `Должников: ${debtors} из ${teamDebts.length}` : 'Сводка по всем этапам турнира'}
        </p>
        <button type="button" onClick={() => setChargeTeamId('')} disabled={stages.length === 0}>
          <Icon name="plus" size={18} />
          Начислить
        </button>
      </div>

      <ErrorText error={settings.error ?? summary.error ?? debts.error ?? charges.error} />
      {summary.isPending && <Loading />}

      {summary.data && (
        <FinanceOverview
          summary={summary.data}
          extra={
            <div className="stat">
              <p className="stat-label">Взнос за матч</p>
              <p className="stat-value">{formatMoney(settings.data?.tournamentAmount ?? 0)}</p>
              <p className="stat-hint">с каждой команды</p>
            </div>
          }
        />
      )}

      {teamDebts.length === 0 ? (
        <EmptyState icon="layers" title="Начислений пока нет">
          Взносы за матчи появятся вместе с матчами. Вступительный взнос или штраф можно начислить кнопкой
          «Начислить».
        </EmptyState>
      ) : (
        <Card title="Команды" flush>
          <table className="data-table">
            <thead>
              <tr>
                <th>Команда</th>
                <th className="col-secondary">Оплачено</th>
                <th>Долг</th>
                <th>
                  <span className="visually-hidden">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {teamDebts.map((debt) => (
                <tr key={debt.teamId}>
                  <td>
                    <strong>{debt.teamName || '…'}</strong>
                    <PaidBar paid={debt.paid} charged={debt.charged} label={`Оплачено командой ${debt.teamName}`} />
                  </td>
                  <td className="col-secondary num">
                    {formatMoney(debt.paid)} <span className="muted">из {formatMoney(debt.charged)}</span>
                  </td>
                  <td className="num">
                    {debt.debt > 0 ? <strong className="error-text">{formatMoney(debt.debt)}</strong> : <Badge tone="success">Нет</Badge>}
                  </td>
                  <td>
                    <Menu
                      triggerClassName="icon-button"
                      triggerLabel={`Действия: ${debt.teamName}`}
                      trigger={<Icon name="more" />}
                      align="end"
                    >
                      <MenuButton onClick={() => setChargeTeamId(debt.teamId)}>Начислить команде…</MenuButton>
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card
        title="Разовые начисления"
        flush
        actions={
          <div className="chips" role="group" aria-label="Фильтр начислений">
            <button type="button" className="chip" aria-pressed={!onlyDebt} onClick={() => setOnlyDebt(false)}>
              Все
            </button>
            <button type="button" className="chip" aria-pressed={onlyDebt} onClick={() => setOnlyDebt(true)}>
              Неоплаченные
            </button>
          </div>
        }
      >
        {manual.length === 0 ? (
          <div className="card-body">
            <p className="muted">
              {onlyDebt ? 'Неоплаченных разовых начислений нет.' : 'Вступительных взносов, штрафов и прочих начислений пока нет.'}
            </p>
          </div>
        ) : (
          <table className="stack-table">
            <thead>
              <tr>
                <th>Начисление</th>
                <th>Команда</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {manual.map((charge) => (
                <tr key={charge.id}>
                  <td className="cell-wide">
                    <strong>{chargeKindLabels[charge.kind]}</strong>
                    <div className="hint">
                      {[charge.description, stageName(charge.stageId), formatDate(charge.createdAtUtc)]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </td>
                  <td data-label="Команда">{charge.teamName || '…'}</td>
                  <td data-label="Сумма" className="num cell-end">
                    {formatMoney(charge.amount)}
                  </td>
                  <td>
                    <Badge tone={chargeStatusTones[charge.status]}>{chargeStatusLabels[charge.status]}</Badge>
                    {charge.status === 'Paid' && (
                      <div className="hint">
                        {charge.paidAtUtc ? formatDate(charge.paidAtUtc) : ''}
                        {charge.paymentMethod ? ` · ${paymentMethodLabels[charge.paymentMethod]}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="actions-cell">
                    <ChargeActions charge={charge} teamName={charge.teamName} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Тариф за матч">
        <form onSubmit={onSubmitFee}>
          <div className="row">
            <label>
              Взнос за матч с одной команды, ₽
              <input
                name="amount"
                type="number"
                min={0}
                step={50}
                defaultValue={settings.data?.tournamentAmount ?? 0}
                key={settings.data?.tournamentAmount ?? 'new'}
              />
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <ErrorText error={setFee.error} />
          <button type="submit" disabled={setFee.isPending}>
            {setFee.isPending ? 'Сохраняем…' : 'Сохранить тариф'}
          </button>
          <p className="hint">
            Применяется к новым матчам. В этапе можно задать свою сумму — она заменит турнирную.
          </p>
        </form>
      </Card>

      <Modal open={chargeTeamId !== null} onClose={() => setChargeTeamId(null)} title="Начисление команде">
        <ManualChargeForm
          tournamentId={tournamentId}
          stages={stages}
          presetTeamId={chargeTeamId ?? ''}
          onDone={() => setChargeTeamId(null)}
        />
      </Modal>
    </>
  )
}
