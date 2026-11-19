import type { StandingsRow } from '@/api/types'
import { hasLiveRows } from '@/hooks'

/**
 * Пометка «Live» с мигающей точкой у заголовка таблицы: видна, только пока на этапе идут матчи
 * и таблица учитывает их текущий счёт.
 */
export function LiveMark({ rows }: { rows: StandingsRow[] | undefined }) {
  if (!hasLiveRows(rows)) return null

  return (
    <span className="live-mark" title="Идущие матчи учтены с текущим счётом">
      Live
    </span>
  )
}
