import { useState, type FormEvent } from 'react'
import { useStageMatches } from '@/features/matches/hooks'
import { useTeams } from '@/features/teams/hooks'
import { formatDate, formatMoney } from '@/shared/lib/format'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Badge, Card, type BadgeTone } from '@/shared/ui/layout'
import { Menu, MenuButton, MenuTitle } from '@/shared/ui/Menu'
import type { ChargeStatus, PaymentMethod } from '../api'
import {
  useCancelCharge,
  useFeeSettings,
  useFeeSummary,
  usePayCharge,
  useSetStageFee,
  useStageCharges,
} from '../hooks'

const chargeStatusLabels: Record<ChargeStatus, string> = { Pending: 'Ожидается', Paid: 'Оплачено', Cancelled: 'Отменено' }
const chargeStatusTones: Record<ChargeStatus, BadgeTone> = { Pending: 'warning', Paid: 'success', Cancelled: 'neutral' }
const methodLabels: Record<PaymentMethod, string> = {
  Cash: 'Наличные',
  Transfer: 'Перевод',
  Bank: 'Безнал',
}

/**
 * Взносы этапа: свой тариф (или турнирный) и начисления по матчам.
 * Команда платит, организатор отмечает оплату и способ.
 */
export function StageFeesSection({ tournamentId, stageId }: { tournamentId: string; stageId: string }) {
  const settings = useFeeSettings(tournamentId, stageId)
  const summary = useFeeSummary(tournamentId, stageId)
  const [onlyDebt, setOnlyDebt] = useState(false)
  const charges = useStageCharges(stageId, onlyDebt)
  const matches = useStageMatches(stageId)
  const allTeams = useTeams()
  const setStageFee = useSetStageFee()
  const pay = usePayCharge()
  const cancel = useCancelCharge()
  const confirm = useConfirm()

  const [error, setError] = useState<string | null>(null)

  const teamName = (teamId: string) => allTeams.data?.find((team) => team.id === teamId)?.name ?? '…'
  const matchLabel = (matchId: string) => {
    const match = matches.data?.find((item) => item.id === matchId)
    if (!match) return '—'
    return `${teamName(match.homeTeamId)} — ${teamName(match.awayTeamId)}`
  }
  const matchDate = (matchId: string) => {
    const match = matches.data?.find((item) => item.id === matchId)
    return match ? formatDate(match.scheduledTimeUtc) : ''
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
      <ErrorText error={settings.error ?? summary.error ?? charges.error} />

      <div className="stats">
        <div className="stat">
          <p className="stat-label">Взнос за матч · {ownTariff ? 'свой тариф' : 'как в турнире'}</p>
          <p className="stat-value">{formatMoney(settings.data?.effectiveAmount ?? 0)}</p>
        </div>
        {summary.data && (
          <>
            <div className="stat">
              <p className="stat-label">Начислено · оплачено</p>
              <p className="stat-value">
                {formatMoney(summary.data.charged)} · {formatMoney(summary.data.paid)}
              </p>
            </div>
            <div className={summary.data.debt > 0 ? 'stat stat--danger' : 'stat'}>
              <p className="stat-label">Долг · {summary.data.pendingCount} поз.</p>
              <p className="stat-value">{formatMoney(summary.data.debt)}</p>
            </div>
          </>
        )}
      </div>

      <Card title="Тариф этапа">
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
                : 'Начислений нет. Они создаются автоматически при создании матча, если тариф больше нуля.'}
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Матч</th>
                <th>Команда</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(charges.data ?? []).map((charge) => (
                <tr key={charge.id}>
                  <td>
                    {matchLabel(charge.matchId)}
                    <div className="hint">{matchDate(charge.matchId)}</div>
                  </td>
                  <td>
                    {charge.teamName || teamName(charge.teamId)}
                    <div className="hint">{charge.side === 'Home' ? 'хозяева' : 'гости'}</div>
                  </td>
                  <td className="num">{formatMoney(charge.amount)}</td>
                  <td>
                    <Badge tone={chargeStatusTones[charge.status]}>{chargeStatusLabels[charge.status]}</Badge>
                    {charge.status === 'Paid' && (
                      <div className="hint">
                        {charge.paidAtUtc ? formatDate(charge.paidAtUtc) : ''}
                        {charge.paymentMethod ? ` · ${methodLabels[charge.paymentMethod]}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="actions-cell">
                    {charge.status === 'Pending' && (
                      <Menu
                        triggerClassName="secondary"
                        align="end"
                        trigger={
                          <>
                            Отметить оплату
                            <Icon name="chevron-down" size={16} />
                          </>
                        }
                      >
                        <MenuTitle>Оплачено</MenuTitle>
                        {(Object.keys(methodLabels) as PaymentMethod[]).map((method) => (
                          <MenuButton
                            key={method}
                            disabled={pay.isPending}
                            onClick={() => pay.mutate({ chargeId: charge.id, method, comment: null })}
                          >
                            {methodLabels[method]}
                          </MenuButton>
                        ))}
                        <MenuButton
                          danger
                          disabled={cancel.isPending}
                          onClick={() =>
                            void confirm({
                              title: 'Отменить начисление?',
                              message: `${charge.teamName || teamName(charge.teamId)}, ${formatMoney(charge.amount)}. Команде больше не нужно будет его оплачивать.`,
                              confirmLabel: 'Отменить начисление',
                              cancelLabel: 'Не отменять',
                              danger: true,
                            }).then((ok) => {
                              if (ok) cancel.mutate({ chargeId: charge.id, comment: null })
                            })
                          }
                        >
                          Отменить начисление
                        </MenuButton>
                      </Menu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <ErrorText error={pay.error ?? cancel.error} />
    </>
  )
}
