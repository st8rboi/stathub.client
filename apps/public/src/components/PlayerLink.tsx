import type { ReactNode } from 'react'
import { Link } from 'react-router'

export const playerPath = (playerId: string) => `/players/${playerId}`

type PlayerLinkProps = {
  playerId: string | null | undefined
  children: ReactNode
  className?: string
}

/**
 * Имя игрока со ссылкой на его профиль. Без Id (старый сервер, событие без игрока) —
 * обычный текст. Как и TeamLink, внутри другой ссылки не использовать.
 */
export function PlayerLink({ playerId, children, className }: PlayerLinkProps) {
  if (!playerId) return <span className={className}>{children}</span>

  return (
    <Link to={playerPath(playerId)} className={['player-link', className].filter(Boolean).join(' ')}>
      {children}
    </Link>
  )
}
