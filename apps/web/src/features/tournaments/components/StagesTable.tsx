import { stageFormatLabels } from '../labels'
import type { Stage } from '../types'

export function StagesTable({ stages }: { stages: Stage[] }) {
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
            <td>{s.name}</td>
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
