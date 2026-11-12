import { DisciplineSection } from '@/features/discipline/DisciplineSection'
import { stageDisplayName } from '../labels'
import { useTournamentOutlet } from '../tournamentOutlet'

/** Вкладка «Дисциплина» турнира. */
export default function TournamentDisciplinePage() {
  const { tournament } = useTournamentOutlet()
  return (
    <DisciplineSection
      tournamentId={tournament.id}
      stages={tournament.stages.map((stage) => ({ id: stage.id, name: stageDisplayName(tournament, stage) }))}
    />
  )
}
