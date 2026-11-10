import { useState, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router'
import { useOrganizer } from '@/features/organizer/organizerContext'
import { slugify } from '@/shared/lib/slug'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useCreateLeague } from '../hooks'
import { dataSourceLabels } from '../labels'
import type { LeagueDataSource } from '../types'

/** Создание лиги (в модальном окне). После создания открывается страница лиги. */
export function CreateLeagueForm({ onCancel }: { onCancel: () => void }) {
  const { organizerId } = useOrganizer()
  const navigate = useNavigate()
  const create = useCreateLeague()

  const [name, setName] = useState('')
  // Пока slug не правили руками, он подставляется из названия.
  const [customSlug, setCustomSlug] = useState<string | null>(null)
  const slug = customSlug ?? slugify(name)

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    create.mutate(
      {
        organizerId,
        name: name.trim(),
        slug,
        sport: 'Football',
        city: String(form.get('city')).trim() || null,
        region: String(form.get('region')).trim() || null,
        dataSource: form.get('dataSource') as LeagueDataSource,
      },
      { onSuccess: ({ id }) => void navigate(`/leagues/${id}`) },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Название
        <input
          name="name"
          required
          maxLength={200}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="например, Лига любителей футбола"
        />
      </label>
      <label>
        Адрес на витрине (slug)
        <input
          name="slug"
          required
          maxLength={200}
          pattern="[a-zA-Z0-9\-]+"
          value={slug}
          onChange={(e) => setCustomSlug(e.target.value)}
        />
        <span className="hint">Латиница, цифры и дефис. Подставляется из названия — можно поправить.</span>
      </label>
      <div className="row">
        <label>
          Город
          <input name="city" maxLength={200} />
        </label>
        <label>
          Регион
          <input name="region" maxLength={200} />
        </label>
      </div>
      <p className="hint">Город понадобится, чтобы опубликовать лигу на витрине.</p>
      <label>
        Источник данных
        <select name="dataSource" defaultValue="Native">
          {Object.entries(dataSourceLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <ErrorText error={create.error} />
      <div className="actions">
        <button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Создаём…' : 'Создать лигу'}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  )
}
