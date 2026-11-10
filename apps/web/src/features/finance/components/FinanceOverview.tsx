import type { ReactNode } from 'react'
import { formatMoney } from '@/shared/lib/format'
import type { FeeSummary } from '../api'
import { chargeKindLabels } from '../labels'

/** Доля оплаченного в процентах (0–100), без деления на ноль. */
const percent = (paid: number, charged: number) => (charged > 0 ? Math.round((paid / charged) * 100) : 0)

/** Полоса «оплачено из начисленного». */
export function PaidBar({ paid, charged, label }: { paid: number; charged: number; label: string }) {
  const value = percent(paid, charged)
  return (
    <div
      className={value >= 100 ? 'progress progress--done' : 'progress'}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div className="progress-bar" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

/**
 * Сводка по деньгам турнира или этапа: сколько собрано из начисленного, долг,
 * и та же картина по видам начислений (матчи, вступительные, штрафы).
 */
export function FinanceOverview({ summary, extra }: { summary: FeeSummary; extra?: ReactNode }) {
  const collected = percent(summary.paid, summary.charged)

  return (
    <section className="finance-overview" aria-label="Сводка по взносам">
      <div className="finance-main">
        <p className="stat-label">Собрано</p>
        <p className="finance-collected">
          <span className="stat-value">{formatMoney(summary.paid)}</span>
          <span className="muted"> из {formatMoney(summary.charged)}</span>
          <span className="finance-percent">{collected}%</span>
        </p>
        <PaidBar paid={summary.paid} charged={summary.charged} label="Собрано из начисленного" />

        {summary.byKind.length > 1 && (
          <ul className="finance-kinds">
            {summary.byKind.map((item) => (
              <li key={item.kind}>
                <span className="finance-kind-name">{chargeKindLabels[item.kind]}</span>
                <span className="finance-kind-amount num">
                  {formatMoney(item.paid)} / {formatMoney(item.charged)}
                </span>
                <PaidBar paid={item.paid} charged={item.charged} label={chargeKindLabels[item.kind]} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="finance-side">
        <div className={summary.debt > 0 ? 'stat stat--danger' : 'stat'}>
          <p className="stat-label">Долг</p>
          <p className="stat-value">{formatMoney(summary.debt)}</p>
          <p className="stat-hint">{summary.pendingCount} поз. ждут оплаты</p>
        </div>
        {extra}
      </div>
    </section>
  )
}
