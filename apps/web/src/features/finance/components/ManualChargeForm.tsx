import { useState, type SubmitEvent } from 'react'
import { useTournamentTeamsForStages } from '@/features/rosters/hooks'
import { useTeamsByIds } from '@/features/teams/hooks'
import { ErrorText } from '@/shared/ui/ErrorText'
import type { ManualChargeKind } from '../api'
import { useAddManualCharge } from '../hooks'
import { chargeKindLabels, MANUAL_CHARGE_KINDS } from '../labels'

const DESCRIPTION_MAX_LENGTH = 200

const descriptionPlaceholders: Record<ManualChargeKind, string> = {
  EntryFee: 'например, заявочный взнос на сезон',
  Fine: 'например, неявка на матч 12.11',
  Other: 'за что начисление',
}

/**
 * Ручное начисление команде: вступительный взнос, штраф или прочее.
 * Этап необязателен: без этапа начисление относится ко всему турниру.
 * Команды — участники выбранного этапа или всех этапов турнира.
 */
export function ManualChargeForm({
  tournamentId,
  stages,
  presetStageId = '',
  presetTeamId = '',
  onDone,
}: {
  tournamentId: string
  stages: { id: string; name: string }[]
  presetStageId?: string
  presetTeamId?: string
  onDone: () => void
}) {
  const add = useAddManualCharge()

  const [kind, setKind] = useState<ManualChargeKind>('Fine')
  const [stageId, setStageId] = useState(presetStageId)
  const [teamId, setTeamId] = useState(presetTeamId)

  // Без этапа предлагаем команды всех этапов турнира.
  const stageTeams = useTournamentTeamsForStages(stageId ? [stageId] : stages.map((stage) => stage.id))
  const teamIds = new Set(stageTeams.flatMap((query) => query.data ?? []).map((item) => item.teamId))
  if (presetTeamId) teamIds.add(presetTeamId)
  const allTeams = useTeamsByIds([...teamIds])
  const teamOptions = (allTeams.data ?? [])
    .filter((team) => teamIds.has(team.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    add.mutate(
      {
        tournamentId,
        body: {
          teamId,
          stageId: stageId || null,
          kind,
          amount: Math.round(Number(form.get('amount'))),
          description: String(form.get('description') ?? '').trim() || null,
        },
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="chips" role="radiogroup" aria-label="Вид начисления">
        {MANUAL_CHARGE_KINDS.map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={kind === item}
            className="chip"
            onClick={() => setKind(item)}
          >
            {chargeKindLabels[item]}
          </button>
        ))}
      </div>

      {stages.length > 0 && (
        <label>
          Этап
          <select
            value={stageId}
            onChange={(event) => {
              setStageId(event.target.value)
              // Команда могла не играть на новом этапе — пусть выберут заново.
              if (!presetTeamId) setTeamId('')
            }}
          >
            <option value="">Весь турнир</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        Команда
        <select value={teamId} onChange={(event) => setTeamId(event.target.value)} required>
          <option value="" disabled>
            {teamOptions.length === 0 ? 'нет заявленных команд' : 'Выберите команду'}
          </option>
          {teamOptions.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      <div className="row">
        <label>
          Сумма, ₽
          <input name="amount" type="number" min={1} step={1} required />
        </label>
      </div>

      <label>
        Описание{kind === 'Other' ? '' : ' (необязательно)'}
        <input
          name="description"
          maxLength={DESCRIPTION_MAX_LENGTH}
          required={kind === 'Other'}
          placeholder={descriptionPlaceholders[kind]}
        />
      </label>

      <p className="hint">Начисление появится в долге команды. Оплату отмечают так же, как взносы за матчи.</p>

      <ErrorText error={add.error} />
      <div className="actions">
        <button type="submit" disabled={add.isPending || !teamId}>
          {add.isPending ? 'Начисляем…' : 'Начислить'}
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          Отмена
        </button>
      </div>
    </form>
  )
}
