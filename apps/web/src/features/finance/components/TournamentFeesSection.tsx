import { useState, type FormEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useFeeSettings, useFeeSummary, useSetTournamentFee, useTeamDebts } from '../hooks'

const statusLabels = { Pending: 'Ожидается', Paid: 'Оплачено', Cancelled: 'Отменено' } as const

/**
 * Взносы турнира: тариф за матч с команды, сводка и долг по командам.
 * Тариф этапа задаётся на странице этапа и переопределяет турнирный.
 */
export function TournamentFeesSection({ tournamentId }: { tournamentId: string }) {
  const settings = useFeeSettings(tournamentId)
  const summary = useFeeSummary(tournamentId)
  const debts = useTeamDebts(tournamentId)
  const setFee = useSetTournamentFee()

  const [error, setError] = useState<string | null>(null)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const raw = Number(String(form.get('amount') ?? '0'))

    if (!Number.isFinite(raw) || raw < 0) {
      setError('Сумма должна быть неотрицательным числом.')
      return
    }

    setError(null)
    setFee.mutate({ tournamentId, amount: Math.round(raw) })
  }

  return (
    <>
      <ErrorText error={settings.error ?? summary.error ?? debts.error ?? setFee.error} />

      <dl>
        <dt>Тариф турнира</dt>
        <dd>{settings.data ? `${settings.data.tournamentAmount} ₽ за матч с команды` : '…'}</dd>
      </dl>

      <form onSubmit={onSubmit}>
        <label>
          Взнос за матч с одной команды (₽)
          <input
            name="amount"
            type="number"
            min={0}
            step={50}
            defaultValue={settings.data?.tournamentAmount ?? 0}
            key={settings.data?.tournamentAmount ?? 'new'}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={setFee.isPending}>
          Сохранить тариф
        </button>
        <p className="hint">
          Тариф применяется к новым матчам. В дивизионах можно задать свою сумму на странице этапа.
        </p>
      </form>

      {summary.data && (
        <table>
          <thead>
            <tr>
              <th>Начислено</th>
              <th>Оплачено</th>
              <th>Долг</th>
              <th>Ожидает</th>
              <th>Оплачено позиций</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{summary.data.charged} ₽</td>
              <td>{summary.data.paid} ₽</td>
              <td>
                <strong>{summary.data.debt} ₽</strong>
              </td>
              <td>{summary.data.pendingCount}</td>
              <td>{summary.data.paidCount}</td>
            </tr>
          </tbody>
        </table>
      )}

      <h2>Долг по командам</h2>
      {debts.data?.length === 0 ? (
        <p className="notice">Начислений пока нет — они появятся вместе с матчами.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Команда</th>
              <th>Начислено</th>
              <th>Оплачено</th>
              <th>Долг</th>
            </tr>
          </thead>
          <tbody>
            {(debts.data ?? []).map((debt) => (
              <tr key={debt.teamId}>
                <td>{debt.teamName || debt.teamId.slice(0, 8)}</td>
                <td>{debt.charged} ₽</td>
                <td>{debt.paid} ₽</td>
                <td>
                  <strong>{debt.debt} ₽</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

export { statusLabels }
