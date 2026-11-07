import type { SubmitEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useUpdateLeague } from '../hooks'
import type { League } from '../types'

export function EditLeagueForm({ league, onDone }: { league: League; onDone: () => void }) {
  const update = useUpdateLeague()

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)

    update.mutate(
      {
        id: league.id,
        body: {
          name: String(form.get('name')),
          slug: String(form.get('slug')),
          city: String(form.get('city')).trim() || null,
          region: String(form.get('region')).trim() || null,
        },
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Название
        <input name="name" required maxLength={200} defaultValue={league.name} />
      </label>
      <label>
        Slug (адрес лиги на витрине)
        <input name="slug" required maxLength={200} pattern="[a-zA-Z0-9\-]+" defaultValue={league.slug} />
      </label>
      <label>
        Город{league.status === 'Published' ? '' : ' (нужен для публикации)'}
        <input name="city" maxLength={200} defaultValue={league.city ?? ''} required={league.status === 'Published'} />
      </label>
      <label>
        Регион (необязательно)
        <input name="region" maxLength={200} defaultValue={league.region ?? ''} />
      </label>
      {league.status === 'Published' && (
        <p className="hint">Лига опубликована: после смены slug старые ссылки на витрину перестанут работать.</p>
      )}
      <ErrorText error={update.error} />
      <div className="actions">
        <button type="submit" disabled={update.isPending}>
          Сохранить
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          Отмена
        </button>
      </div>
    </form>
  )
}
