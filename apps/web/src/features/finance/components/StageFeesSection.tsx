import { useState, type FormEvent } from 'react'
import { useStageMatches } from '@/features/matches/hooks'
import { useTeams } from '@/features/teams/hooks'
import { formatDate, formatMoney } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Badge, Card, Loading } from '@/shared/ui/layout'
import { Modal } from '@/shared/ui/Modal'
import type { Charge } from '../api'
import { useFeeSettings, useFeeSummary, useSetStageFee, useStageCharges } from '../hooks'
import { chargeKindLabels, chargeStatusLabels, chargeStatusTones, paymentMethodLabels } from '../labels'
import { ChargeActions } from './ChargeActions'
import { FinanceOverview } from './FinanceOverview'
import { ManualChargeForm } from './ManualChargeForm'

/**
 * Взносы этапа: сводка, начисления (за матчи и разовые, выставленные на этот этап),
 * свой тариф за матч (или турнирный).
 */
export function StageFeesSection({
  tournamentId,
  stageId,
  stageName,
}: {
  tournamentId: string
  stageId: string
  stageName: string
}) {
  const settings = useFeeSettings(tournamentId, stageId)
  const summary = useFeeSummary(tournamentId, stageId)
  const [onlyDebt, setOnlyDebt] = useState(false)
  const charges = useStageCharges(stageId, onlyDebt)
  const matches = useStageMatches(stageId)
  const allTeams = useTeams()
  const setStageFee = useSetStageFee()

  const [charging, setCharging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const teamName = (teamId: string) => allTeams.data?.find((team) => team.id === teamId)?.name ?? '…'

  /** Основание начисления: матч («Команда — Команда», дата) или вид + описание. */
  const basis = (charge: Charge) => {
    if (charge.kind !== 'MatchFee') {
      return { title: chargeKindLabels[charge.kind], hint: charge.description ?? formatDate(charge.createdAtUtc) }
    }
    const match = matches.data?.find((item) => item.id === charge.matchId)
    if (!match) return { title: 'Взнос за матч', hint: '' }
    return {
      title: `${teamName(match.homeTeamId)} — ${teamName(match.awayTeamId)}`,
      hint: formatDate(match.scheduledTimeUtc),
    }
  }

  const onSetFee = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const raw = String(new FormData(event.currentTarget).get('amount') ?? '').trim()

    if (!raw) {
      setError(null)
      setStageFee.mutate({ stageId, amount: null })
      return
    }

    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Сумма должна быть неотрицательным числом.')
      return
    }

    setError(null)
    setStageFee.mutate({ stageId, amount: Math.round(amount) })
  }

  const ownTariff = settings.data?.stageAmount != null

  return (
    <>
      <div className="toolbar">
        <p className="muted">Начисления этого этапа: взносы за матчи и разовые</p>
        <button type="button" onClick={() => setCharging(true)}>
          <Icon name="plus" size={18} />
          Начислить
        </button>
      </div>

      <ErrorText error={settings.error ?? summary.error ?? charges.error} />
      {summary.isPending && <Loading />}

      {summary.data && (
        <FinanceOverview
          summary={summary.data}
          extra={
            <div className="stat">
              <p className="stat-label">Взнос за матч</p>
              <p className="stat-value">{formatMoney(settings.data?.effectiveAmount ?? 0)}</p>
              <p className="stat-hint">{ownTariff ? 'свой тариф этапа' : 'как в турнире'}</p>
            </div>
          }
        />
      )}

      <Card
        title="Начисления"
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
        {charges.data?.length === 0 ? (
          <div className="card-body">
            <p className="muted">
              {onlyDebt
                ? 'Долгов нет: все начисления этапа оплачены или отменены.'
                : 'Начислений нет. Взносы за матчи создаются вместе с матчем, если тариф больше нуля.'}
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Основание</th>
                <th>Команда</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(charges.data ?? []).map((charge) => {
                const { title, hint } = basis(charge)
                const name = charge.teamName || teamName(charge.teamId)
                return (
                  <tr key={charge.id}>
                    <td>
                      {title}
                      {hint && <div className="hint">{hint}</div>}
                    </td>
                    <td>
                      {name}
                      {charge.side && <div className="hint">{charge.side === 'Home' ? 'хозяева' : 'гости'}</div>}
                    </td>
                    <td className="num">{formatMoney(charge.amount)}</td>
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
                      <ChargeActions charge={charge} teamName={name} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Тариф за матч на этапе">
        <form onSubmit={onSetFee}>
          <div className="row">
            <label>
              Свой взнос за матч с команды, ₽
              <input
                name="amount"
                type="number"
                min={0}
                step={50}
                placeholder={`как в турнире: ${settings.data?.tournamentAmount ?? 0}`}
                defaultValue={settings.data?.stageAmount ?? ''}
                key={settings.data?.stageAmount ?? 'inherit'}
              />
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <ErrorText error={setStageFee.error} />
          <div className="actions">
            <button type="submit" disabled={setStageFee.isPending}>
              Сохранить
            </button>
            {ownTariff && (
              <button
                type="button"
                className="secondary"
                disabled={setStageFee.isPending}
                onClick={() => setStageFee.mutate({ stageId, amount: null })}
              >
                Как в турнире
              </button>
            )}
          </div>
          <p className="hint">Пустое поле — действует тариф турнира. Тариф применяется к новым матчам.</p>
        </form>
      </Card>

      <Modal open={charging} onClose={() => setCharging(false)} title="Начисление команде">
        <ManualChargeForm
          tournamentId={tournamentId}
          stages={[{ id: stageId, name: stageName }]}
          presetStageId={stageId}
          onDone={() => setCharging(false)}
        />
      </Modal>
    </>
  )
}
