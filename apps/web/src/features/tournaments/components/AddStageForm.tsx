import { useAddStage } from '../hooks'
import { StageForm } from './StageForm'

export function AddStageForm({ leagueId, tournamentId }: { leagueId: string; tournamentId: string }) {
  const addStage = useAddStage(leagueId, tournamentId)

  return (
    <StageForm
      submitLabel="Добавить этап"
      pending={addStage.isPending}
      error={addStage.error}
      onSubmit={(body, form) => addStage.mutate(body, { onSuccess: () => form.reset() })}
    />
  )
}
