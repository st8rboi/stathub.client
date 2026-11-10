import type { SubmitEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useCreateTeam } from '../hooks'

/** Новая команда справочника (в модальном окне). Логотип добавляется после создания. */
export function CreateTeamForm({ onDone }: { onDone: () => void }) {
  const create = useCreateTeam()

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)

    create.mutate(
      {
        name: String(form.get('name')).trim(),
        city: String(form.get('city')).trim() || null,
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Название команды
        <input name="name" required maxLength={150} placeholder="ФК «Звезда»" autoFocus />
      </label>
      <label>
        Город
        <input name="city" maxLength={100} placeholder="необязательно" />
      </label>
      <p className="hint">Логотип можно загрузить после создания — в карточке команды.</p>
      <ErrorText error={create.error} />
      <div className="actions">
        <button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Добавляем…' : 'Добавить команду'}
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          Отмена
        </button>
      </div>
    </form>
  )
}
