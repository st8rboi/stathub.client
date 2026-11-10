import { StageFeesSection } from '@/features/finance/components/StageFeesSection'
import { useStageOutlet } from '../stageOutlet'

/** Вкладка «Взносы» этапа. */
export default function StageFeesPage() {
  const { tournament, stage } = useStageOutlet()
  return <StageFeesSection tournamentId={tournament.id} stageId={stage.id} />
}
