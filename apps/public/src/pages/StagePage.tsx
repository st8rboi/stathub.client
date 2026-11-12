import { Link, useParams } from 'react-router'
import { FixtureRow } from '@/components/FixtureRow'
import { Skeleton } from '@/components/Skeleton'
import { StandingsTable } from '@/components/StandingsTable'
import { useStage } from '@/hooks'
import { stageFormatLabels } from '@/labels'

export default function StagePage() {
  const { stageId = '' } = useParams()
  const stage = useStage(stageId)

  if (stage.error) return <p className="notice">Не удалось загрузить этап: {stage.error.message}</p>
  if (!stage.data) return <Skeleton rows={5} />

  const { stage: info, matches, standings, standingsGroups, divisionStages } = stage.data
  // Дивизион показываем, только когда их несколько: тогда он и есть «соревнование» страницы.
  const multiDivision = info.divisionsCount > 1
  const hasSiblings = divisionStages.length > 1

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
          <h1>{multiDivision ? info.divisionName : info.name}</h1>
          <p className="muted">
            {info.tournamentName}
            {multiDivision && hasSiblings && ` · ${info.name}`} ·{' '}
            {stageFormatLabels[info.formatType] ?? info.formatType} · очки {info.winPoints}/{info.drawPoints}/
            {info.lossPoints}
          </p>
        </div>
      </div>

      {hasSiblings && (
        <nav className="date-strip" aria-label="Этапы">
          {divisionStages.map((item) => (
            <Link
              key={item.id}
              to={`/stages/${item.id}`}
              className={item.id === info.id ? 'date-tab active' : 'date-tab'}
              aria-current={item.id === info.id ? 'page' : undefined}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="stage-columns">
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
        </section>

        <section>
          <div className="section-head">
            <h2>Таблица</h2>
          </div>
          <div className="competition competition--plain">
            <StandingsTable rows={standings} groups={standingsGroups} />
          </div>
        </section>
      </div>
    </>
  )
}
