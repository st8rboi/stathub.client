import { Link, useParams } from 'react-router'
import { FixtureRow } from '@/components/FixtureRow'
import { StandingsTable } from '@/components/StandingsTable'
import { useStage } from '@/hooks'
import { stageFormatLabels } from '@/labels'

export default function StagePage() {
  const { stageId = '' } = useParams()
  const stage = useStage(stageId)

  if (stage.error) return <p className="notice">Не удалось загрузить этап: {stage.error.message}</p>
  if (!stage.data) return <p className="muted">Загрузка…</p>

  const { stage: info, matches, standings } = stage.data

  return (
    <>
      <p className="crumb">
        <Link to={`/leagues/${info.leagueSlug}`}>← {info.leagueName}</Link>
      </p>

      <div className="league-header">
        {info.leagueLogoUrl ? (
          <img src={info.leagueLogoUrl} alt="" className="league-hero-logo" />
        ) : (
          <span className="league-hero-logo league-card-logo--empty" />
        )}

        <div>
          <h1>{info.name}</h1>
          <p className="muted">
            {info.tournamentName} · {stageFormatLabels[info.formatType] ?? info.formatType} · очки{' '}
            {info.winPoints}/{info.drawPoints}/{info.lossPoints}
          </p>
        </div>
      </div>

      <div className="columns">
        <section>
          <div className="section-head">
            <h2>Матчи</h2>
          </div>

          {matches.length === 0 ? (
            <p className="notice">Матчей на этом этапе пока нет.</p>
          ) : (
            <div className="competition competition--plain">
              <div className="competition-body">
                {matches.map((match) => (
                  <FixtureRow key={match.id} match={match} />
                ))}
              </div>
            </div>
          )}

          <div className="section-head">
            <h2>Таблица</h2>
          </div>
          <div className="competition competition--plain">
            <StandingsTable rows={standings} />
          </div>
        </section>
      </div>
    </>
  )
}
