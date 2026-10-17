import { Link } from 'react-router'
import { stageFormatLabels } from '../labels'
import type { Stage } from '../types'

type Props = {
  leagueId: string
  tournamentId: string
  stages: Stage[]
}

export function StagesTable({ leagueId, tournamentId, stages }: Props) {
  if (stages.length === 0) return <p>Этапов пока нет.</p>

  return (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Название</th>
          <th>Формат</th>
          <th>Очки (В/Н/П)</th>
          <th>Матч</th>
        </tr>
      </thead>
      <tbody>
        {stages.map((s) => (
          <tr key={s.id}>
            <td>{s.order}</td>
            <td>
              <Link to={`/leagues/${leagueId}/tournaments/${tournamentId}/stages/${s.id}`}>{s.name}</Link>
            </td>
            <td>{stageFormatLabels[s.formatType]}</td>
            <td>
              {s.winPoints} / {s.drawPoints} / {s.lossPoints}
            </td>
            <td>
              {s.periodsCount} × {s.periodDurationMinutes} мин
              {s.extraTimeEnabled && ', доп. время'}
              {s.penaltyShootoutEnabled && ', пенальти'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
