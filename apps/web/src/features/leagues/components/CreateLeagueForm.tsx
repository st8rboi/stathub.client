import type { SubmitEvent } from 'react'
import { useNavigate } from 'react-router'
import { useOrganizer } from '@/features/organizer/organizerContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useCreateLeague } from '../hooks'
import { dataSourceLabels } from '../labels'
import type { LeagueDataSource } from '../types'

export function CreateLeagueForm() {
  const { organizerId } = useOrganizer()
  const navigate = useNavigate()
  const create = useCreateLeague()

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    create.mutate(
      {
        organizerId,
        name: String(form.get('name')),
        slug: String(form.get('slug')),
        sport: 'Football',
        city: String(form.get('city')) || null,
        region: String(form.get('region')) || null,
        dataSource: form.get('dataSource') as LeagueDataSource,
      },
      { onSuccess: ({ id }) => void navigate(`/leagues/${id}`) },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Название
        <input name="name" required maxLength={200} />
      </label>
      <label>
        Slug (латиница, для публичной ссылки)
        <input name="slug" required maxLength={200} pattern="[a-zA-Z0-9\-]+" />
      </label>
      <label>
        Город (обязателен для публикации)
        <input name="city" maxLength={200} />
      </label>
      <label>
        Регион
        <input name="region" maxLength={200} />
      </label>
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
      <button type="submit" disabled={create.isPending}>
        Создать лигу
      </button>
    </form>
  )
}
