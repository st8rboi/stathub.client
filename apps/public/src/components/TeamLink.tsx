import { Link } from 'react-router'

export const teamPath = (teamId: string) => `/teams/${teamId}`

type TeamLinkProps = {
  teamId: string | null | undefined
  name: string | null | undefined
  logoUrl?: string | null
  /** Без логотипа — для мест, где герб уже показан рядом или не помещается. */
  hideLogo?: boolean
  className?: string
}

/**
 * Команда «герб + название» со ссылкой на её страницу. Без Id (старые данные, событие без команды)
 * рендерится обычным текстом. Внутри другой ссылки (строка матча) не использовать: вложенные
 * ссылки — невалидный HTML.
 */
export function TeamLink({ teamId, name, logoUrl = null, hideLogo = false, className }: TeamLinkProps) {
  const content = (
    <>
      {!hideLogo &&
        (logoUrl ? (
          <img src={logoUrl} alt="" className="team-logo team-logo--sm" />
        ) : (
          <span className="team-logo team-logo--sm team-logo--empty" />
        ))}
      <span>{name || '—'}</span>
    </>
  )

  const classes = ['standings-team', className].filter(Boolean).join(' ')

  if (!teamId) return <div className={classes}>{content}</div>

  return (
    <Link to={teamPath(teamId)} className={classes + ' team-link'}>
      {content}
    </Link>
  )
}
