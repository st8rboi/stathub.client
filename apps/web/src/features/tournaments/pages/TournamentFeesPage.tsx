import { TournamentFeesSection } from '@/features/finance/components/TournamentFeesSection'
import { useTournamentOutlet } from '../tournamentOutlet'

/** Вкладка «Взносы» турнира. */
export default function TournamentFeesPage() {
  const { tournament } = useTournamentOutlet()
  return (
    <TournamentFeesSection
      tournamentId={tournament.id}
      stages={tournament.stages.map((stage) => ({ id: stage.id, name: stage.name }))}
    />
  )
}
