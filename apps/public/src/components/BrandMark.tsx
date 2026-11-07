/**
 * Знак «Статхаб»: четыре капсулы крестом — верхние залиты, нижние контурные.
 * Одна капсула описана путём (внешний конец срезан горизонтально, внутренний скруглён),
 * остальные получены отражением относительно центра знака (226.5; 465).
 * Цвет — currentColor, толщина контура не масштабируется, чтобы знак читался и в 24px.
 */
const CAPSULE = 'M120.12 333H74.88L178.19 436.31A16 16 0 0 0 200.81 413.69Z'

export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="70 329 313 272"
      aria-hidden="true"
      focusable="false"
      strokeLinejoin="round"
    >
      <g fill="currentColor" stroke="currentColor" strokeWidth="1">
        <path d={CAPSULE} vectorEffect="non-scaling-stroke" />
        <path d={CAPSULE} transform="matrix(-1 0 0 1 453 0)" vectorEffect="non-scaling-stroke" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d={CAPSULE} transform="matrix(1 0 0 -1 0 930)" vectorEffect="non-scaling-stroke" />
        <path d={CAPSULE} transform="matrix(-1 0 0 -1 453 930)" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  )
}
