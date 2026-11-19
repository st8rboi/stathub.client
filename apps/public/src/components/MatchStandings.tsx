import { Link } from 'react-router'
import type { PublicMatch, PublicStagePage } from '@/api/types'
import { LiveMark } from '@/components/LiveMark'
import { StandingsTable } from '@/components/StandingsTable'

/** Есть ли у этапа таблица, которую стоит показать рядом с матчем: в плей-офф её нет. */
export function stageHasTable(stage: PublicStagePage | undefined): stage is PublicStagePage {
  return (
    !!stage &&
    stage.stage.formatType !== 'Playoff' &&
    (stage.standings.length > 0 || stage.standingsGroups.length > 0)
  )
}

type Props = {
  match: PublicMatch
  stage: PublicStagePage
  /** Узкая колонка справа на ПК: без побед, ничьих, поражений и голов. */
  compact?: boolean
}

/**
 * Live-таблица этапа на странице матча. В групповом этапе — только группа этого матча.
 * Обе команды матча выделены; пока матчи идут, их строки подсвечены по текущему исходу.
 */
export function MatchStandings({ match, stage, compact = false }: Props) {
  const ownGroup = stage.standingsGroups.find((group) =>
    group.rows.some((row) => row.teamId === match.homeTeamId || row.teamId === match.awayTeamId),
  )
  const groups = ownGroup ? [ownGroup] : stage.standingsGroups

  return (
    <section className="competition competition--plain match-standings" aria-label="Турнирная таблица">
      <div className="match-standings-head">
        <h2>
          Таблица <LiveMark rows={stage.standings} />
        </h2>
        <Link to={`/stages/${match.stageId}`} className="section-link match-standings-link">
          Этап →
        </Link>
      </div>
      <StandingsTable
        rows={stage.standings}
        groups={groups}
        highlightTeamIds={[match.homeTeamId, match.awayTeamId]}
        compact={compact}
      />
    </section>
  )
}
