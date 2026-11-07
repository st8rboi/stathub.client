import { useId } from 'react'

// Классический мяч: центральный пятиугольник, лоскуты по краю (обрезаны окружностью) и швы.
const BALL_CENTER = 'M12 8.3 15.52 10.86 14.17 14.99H9.83L8.48 10.86Z'
const BALL_PATCHES =
  'M20.11 .84 21.42 4.86 18 7.35 14.57 4.86 15.88 .84Z' +
  'M25.12 16.26 21.7 18.75 18.28 16.26 19.58 12.24H23.82Z' +
  'M12 25.8 8.58 23.31 9.88 19.29H14.12L15.42 23.31Z' +
  'M-1.12 16.26 .18 12.24H4.42L5.72 16.26 2.3 18.75Z' +
  'M3.89 .84H8.12L9.43 4.86 6 7.35 2.58 4.86Z'
const BALL_SEAMS =
  'M12 8.3V4.4M15.52 10.86 19.23 9.65M14.17 14.99 16.47 18.15M9.83 14.99 7.53 18.15M8.48 10.86 4.77 9.65'

/** Иконки событий протокола: мяч, карточки, замена — как на флешскоре. */
export function MatchEventIcon({ type }: { type: string }) {
  const clipId = useId()

  switch (type) {
    case 'Goal':
    case 'OwnGoal':
      return (
        <svg
          viewBox="0 0 24 24"
          className={type === 'OwnGoal' ? 'pe-ball pe-ball--own' : 'pe-ball'}
          aria-hidden="true"
        >
          <clipPath id={clipId}>
            <circle cx="12" cy="12" r="10" />
          </clipPath>
          <circle cx="12" cy="12" r="10" fill="var(--bg)" />
          <g clipPath={`url(#${clipId})`} fill="currentColor">
            <path d={BALL_CENTER} />
            <path d={BALL_PATCHES} />
            <path d={BALL_SEAMS} fill="none" stroke="currentColor" strokeWidth="1.2" />
          </g>
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'YellowCard':
      return <span className="pe-card pe-card--yellow" aria-hidden="true" />
    case 'RedCard':
      return <span className="pe-card pe-card--red" aria-hidden="true" />
    case 'Substitution':
      return (
        <svg viewBox="0 0 24 24" className="pe-sub" aria-hidden="true" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 9h12l-3-3" stroke="var(--red)" />
          <path d="M19 15H7l3 3" stroke="var(--green)" />
        </svg>
      )
    default:
      return <span className="pe-dot" aria-hidden="true" />
  }
}
