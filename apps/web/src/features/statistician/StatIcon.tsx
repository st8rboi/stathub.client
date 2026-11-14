import type { ReactNode } from 'react'
import type { StatType } from './types'

/** Значки кнопок статистика: 24×24, обводка currentColor — в стиле общего набора иконок. */
const paths: Record<StatType, ReactNode> = {
  // Удар: мяч и линии полёта.
  Shot: (
    <>
      <circle cx="15" cy="12" r="6" />
      <path d="m15 9 2.5 1.8-1 3h-3l-1-3L15 9Z" />
      <path d="M2 9h4M3 12h4M2 15h4" />
    </>
  ),
  // В створ: ворота и мяч внутри.
  ShotOnTarget: (
    <>
      <path d="M3 19V6h18v13" />
      <path d="M3 10h18M8 6v4M16 6v4" />
      <circle cx="12" cy="15" r="3" />
    </>
  ),
  // Фол: свисток.
  Foul: (
    <>
      <path d="M10 9h11v4l-6 1a5 5 0 1 1-5-5Z" />
      <circle cx="10" cy="14" r="1.5" />
      <path d="M13 9V6h3" />
    </>
  ),
  // Угловой: флажок в углу поля и дуга.
  Corner: (
    <>
      <path d="M5 21V4l9 3-9 3" />
      <path d="M5 21h15" />
      <path d="M5 15a6 6 0 0 1 6 6" />
    </>
  ),
}

export function StatIcon({ type, size = 22 }: { type: StatType; size?: number }) {
  return (
    <svg
      className="stat-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[type]}
    </svg>
  )
}
