import { Link, useParams } from 'react-router'
import { useLeague } from '@/hooks'
import { stageFormatLabels, tournamentStatusLabels } from '@/labels'

export default function LeaguePage() {
  const { slug = '' } = useParams()
  const league = useLeague(slug)

  if (league.error) return <p className="notice">Не удалось загрузить лигу: {league.error.message}</p>
  if (!league.data) return <p className="muted">Загрузка…</p>

  const { league: info, tournaments } = league.data

  return (
    <>
      <p className="crumb">
        <Link to="/leagues">← Все лиги</Link>
      </p>

      <div className="league-header">
        {info.logoUrl ? (
          <img src={info.logoUrl} alt="" className="league-hero-logo" />
        ) : (
          <span className="league-hero-logo league-card-logo--empty" />
        )}

        <div>
          <h1>{info.name}</h1>
          <p className="muted">
            {[info.city, info.region].filter(Boolean).join(', ') || 'География не указана'} ·{' '}
            {info.sport}
          </p>
        </div>
      </div>

      {tournaments.length === 0 && <p className="notice">В лиге пока нет турниров.</p>}

      {tournaments.map((tournament) => (
        <section key={tournament.id} className="competition">
          <div className="competition-head competition-head--static">
            <span className="competition-title">
              <span className="competition-name">{tournament.name}</span>
              <span className="competition-meta">
                {tournamentStatusLabels[tournament.status] ?? tournament.status} ·{' '}
                {tournament.startDate}
                {tournament.endDate ? ` — ${tournament.endDate}` : ''}
              </span>
            </span>

            <Link
              to={`/statistics?league=${info.slug}&tournament=${tournament.id}`}
              className="section-link"
            >
              Статистика →
            </Link>
          </div>

          <div className="competition-body">
            {tournament.stages.length === 0 ? (
              <p className="muted" style={{ padding: '10px 16px' }}>
                Этапы ещё не заданы.
              </p>
            ) : (
              tournament.stages.map((stage) => (
                <Link key={stage.id} to={`/stages/${stage.id}`} className="stage-row">
                  <span className="fixture-name">{stage.name}</span>
                  <span className="badge">{stageFormatLabels[stage.formatType] ?? stage.formatType}</span>
                </Link>
              ))
            )}
          </div>
        </section>
      ))}
    </>
  )
}
