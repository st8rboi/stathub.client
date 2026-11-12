import { TournamentFeesSection } from '@/features/finance/components/TournamentFeesSection'
import { stageDisplayName } from '../labels'
import { useTournamentOutlet } from '../tournamentOutlet'

/** Вкладка «Взносы» турнира. */
export default function TournamentFeesPage() {
  const { tournament } = useTournamentOutlet()
  return (
    <TournamentFeesSection
      tournamentId={tournament.id}
      stages={tournament.stages.map((stage) => ({ id: stage.id, name: stageDisplayName(tournament, stage) }))}
    />
  )
}
