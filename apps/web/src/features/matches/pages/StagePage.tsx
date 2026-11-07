import { Link, useParams } from 'react-router'
import { MatchesSection } from '@/features/matches/components/MatchesSection'
import { TournamentTeamsSection } from '@/features/rosters/components/TournamentTeamsSection'
import { StageFeesSection } from '@/features/finance/components/StageFeesSection'
import { stageFormatLabels } from '@/features/tournaments/labels'
import { useTournament } from '@/features/tournaments/hooks'
import { ErrorText } from '@/shared/ui/ErrorText'

export default function StagePage() {
  const { leagueId = '', tournamentId = '', stageId = '' } = useParams()

  const tournament = useTournament(leagueId, tournamentId)

  if (tournament.error) return <ErrorText error={tournament.error} />
  if (!tournament.data) return <p>Загрузка…</p>

  const stage = tournament.data.stages.find((item) => item.id === stageId)

  if (!stage) {
    return (
      <p className="notice">
        Этап не найден. <Link to={`/leagues/${leagueId}/tournaments/${tournamentId}`}>Вернуться к турниру</Link>
      </p>
    )
  }

  return (
    <>
      <p>
        <Link to={`/leagues/${leagueId}/tournaments/${tournamentId}`}>← К турниру</Link>
      </p>
      <h1>{stage.name}</h1>

      <dl>
        <dt>Формат</dt>
        <dd>{stageFormatLabels[stage.formatType]}</dd>
        <dt>Очки (В/Н/П)</dt>
        <dd>
          {stage.winPoints} / {stage.drawPoints} / {stage.lossPoints}
        </dd>
        <dt>Регламент</dt>
        <dd>
          {stage.periodsCount} × {stage.periodDurationMinutes} мин
          {stage.extraTimeEnabled && ', доп. время'}
          {stage.penaltyShootoutEnabled && ', пенальти'}
        </dd>
      </dl>

      <h2>Участники этапа</h2>
      <TournamentTeamsSection leagueId={leagueId} tournamentId={tournamentId} stageId={stageId} />

      <h2>Матчи</h2>
      <MatchesSection stageId={stageId} />

      <h2>Взносы этапа</h2>
      <StageFeesSection tournamentId={tournamentId} stageId={stageId} />
    </>
  )
}
