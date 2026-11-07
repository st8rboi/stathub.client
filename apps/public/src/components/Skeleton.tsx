/** Заглушка на время загрузки: повторяет форму строк списка, чтобы страница не прыгала. */
export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton" role="status" aria-label="Загрузка">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton-row">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      ))}
    </div>
  )
}
