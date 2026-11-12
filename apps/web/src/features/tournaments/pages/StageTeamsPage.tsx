import { TournamentTeamsSection } from '@/features/rosters/components/TournamentTeamsSection'
import { useStageOutlet } from '../stageOutlet'

/** Вкладка «Участники» этапа. */
export default function StageTeamsPage() {
  const { stage, basePath } = useStageOutlet()
  return <TournamentTeamsSection stageId={stage.id} divisionId={stage.divisionId} basePath={basePath} />
}
