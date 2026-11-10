import { useState, type FormEvent } from 'react'
import { formatMoney } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Card, EmptyState } from '@/shared/ui/layout'
import { useFeeSettings, useFeeSummary, useSetTournamentFee, useTeamDebts } from '../hooks'

/**
 * Взносы турнира: сводка, тариф за матч с команды и долг по командам.
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

  // Должники сверху: так видно, с кого собирать.
  const sortedDebts = [...(debts.data ?? [])].sort((a, b) => b.debt - a.debt)

  return (
    <>
      <ErrorText error={settings.error ?? summary.error ?? debts.error} />

      {summary.data && (
        <div className="stats">
          <div className="stat">
            <p className="stat-label">Начислено</p>
            <p className="stat-value">{formatMoney(summary.data.charged)}</p>
          </div>
          <div className="stat">
            <p className="stat-label">Оплачено · {summary.data.paidCount} поз.</p>
            <p className="stat-value">{formatMoney(summary.data.paid)}</p>
          </div>
          <div className={summary.data.debt > 0 ? 'stat stat--danger' : 'stat'}>
            <p className="stat-label">Долг · {summary.data.pendingCount} поз. ожидают</p>
            <p className="stat-value">{formatMoney(summary.data.debt)}</p>
          </div>
        </div>
      )}

      <Card title="Тариф турнира">
        <form onSubmit={onSubmit}>
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
            Тариф применяется к новым матчам. В этапе можно задать свою сумму — она заменит турнирную.
          </p>
        </form>
      </Card>

      {debts.data?.length === 0 ? (
        <EmptyState title="Начислений пока нет">Они появятся вместе с матчами.</EmptyState>
      ) : (
        <Card title="Долг по командам" flush>
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
              {sortedDebts.map((debt) => (
                <tr key={debt.teamId}>
                  <td>{debt.teamName || debt.teamId.slice(0, 8)}</td>
                  <td className="num">{formatMoney(debt.charged)}</td>
                  <td className="num">{formatMoney(debt.paid)}</td>
                  <td className="num">
                    {debt.debt > 0 ? <strong className="error-text">{formatMoney(debt.debt)}</strong> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  )
}
