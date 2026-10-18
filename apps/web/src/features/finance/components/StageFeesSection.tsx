import { useState, type FormEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import type { PaymentMethod } from '../api'
import {
  useCancelCharge,
  useFeeSettings,
  usePayCharge,
  useSetStageFee,
  useStageCharges,
} from '../hooks'

const chargeStatusLabels = { Pending: 'Ожидается', Paid: 'Оплачено', Cancelled: 'Отменено' } as const
const methodLabels: Record<PaymentMethod, string> = {
  Cash: 'Наличные',
  Transfer: 'Перевод',
  Bank: 'Безнал',
}

/**
 * Взносы этапа: переопределение тарифа и начисления по матчам.
 * Команда платит, организатор отмечает оплату (способ + комментарий).
 */
export function StageFeesSection({
  tournamentId,
  stageId,
}: {
  tournamentId: string
  stageId: string
}) {
  const settings = useFeeSettings(tournamentId, stageId)
  const [onlyDebt, setOnlyDebt] = useState(false)
  const charges = useStageCharges(stageId, onlyDebt)
  const setStageFee = useSetStageFee()
  const pay = usePayCharge()
  const cancel = useCancelCharge()

  const [error, setError] = useState<string | null>(null)
  const [methods, setMethods] = useState<Record<string, PaymentMethod>>({})

  const onSetFee = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const raw = String(new FormData(event.currentTarget).get('amount') ?? '').trim()

    if (!raw) {
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

  return (
    <>
      <ErrorText error={settings.error ?? charges.error ?? setStageFee.error ?? pay.error ?? cancel.error} />

      <dl>
        <dt>Тариф турнира</dt>
        <dd>{settings.data?.tournamentAmount ?? 0} ₽</dd>
        <dt>Тариф этапа</dt>
        <dd>
          {settings.data?.stageAmount != null ? `${settings.data.stageAmount} ₽ (свой)` : 'наследует турнир'}
        </dd>
        <dt>Действует</dt>
        <dd>
          <strong>{settings.data?.effectiveAmount ?? 0} ₽</strong> за матч с команды
        </dd>
      </dl>

      <form onSubmit={onSetFee}>
        <label>
          Свой взнос для этапа (₽), пусто — как в турнире
          <input
            name="amount"
            type="number"
            min={0}
            step={50}
            placeholder="наследовать"
            defaultValue={settings.data?.stageAmount ?? ''}
            key={settings.data?.stageAmount ?? 'inherit'}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={setStageFee.isPending}>
          Сохранить взнос этапа
        </button>
      </form>

      <label className="check">
        <input type="checkbox" checked={onlyDebt} onChange={(e) => setOnlyDebt(e.target.checked)} />
        Только неоплаченные
      </label>

      {charges.data?.length === 0 ? (
        <p className="notice">
          Начислений нет. Они создаются автоматически при создании матча, если тариф больше нуля.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Матч</th>
              <th>Команда</th>
              <th>Сторона</th>
              <th>Сумма</th>
              <th>Статус</th>
              <th>Оплата</th>
            </tr>
          </thead>
          <tbody>
            {(charges.data ?? []).map((charge) => (
              <tr key={charge.id}>
                <td className="mono">{charge.matchId.slice(0, 8)}</td>
                <td>{charge.teamName || charge.teamId.slice(0, 8)}</td>
                <td>{charge.side === 'Home' ? 'хозяева' : 'гости'}</td>
                <td>{charge.amount} ₽</td>
                <td>{chargeStatusLabels[charge.status]}</td>
                <td>
                  {charge.status === 'Pending' ? (
                    <span className="referee-cell">
                      <select
                        value={methods[charge.id] ?? 'Transfer'}
                        onChange={(event) =>
                          setMethods((current) => ({
                            ...current,
                            [charge.id]: event.target.value as PaymentMethod,
                          }))
                        }
                        aria-label="Способ оплаты"
                      >
                        {Object.entries(methodLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={pay.isPending}
                        onClick={() =>
                          pay.mutate({
                            chargeId: charge.id,
                            method: methods[charge.id] ?? 'Transfer',
                            comment: null,
                          })
                        }
                      >
                        Оплачено
                      </button>
                      <button
                        type="button"
                        className="danger"
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate({ chargeId: charge.id, comment: null })}
                      >
                        Отменить
                      </button>
                    </span>
                  ) : charge.status === 'Paid' ? (
                    <span className="muted">
                      {charge.paidAtUtc ? new Date(charge.paidAtUtc).toLocaleDateString('ru-RU') : ''}
                      {charge.paymentMethod ? ` · ${methodLabels[charge.paymentMethod]}` : ''}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
