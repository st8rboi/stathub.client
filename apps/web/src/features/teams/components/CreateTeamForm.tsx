import type { SubmitEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useCreateTeam } from '../hooks'

export function CreateTeamForm() {
  const create = useCreateTeam()

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formElement = e.currentTarget
    const form = new FormData(formElement)

    create.mutate(
      {
        name: String(form.get('name')),
        city: String(form.get('city')) || null,
      },
      { onSuccess: () => formElement.reset() },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Название команды
        <input name="name" required maxLength={150} placeholder="ФК «Звезда»" />
      </label>
      <label>
        Город (необязательно)
        <input name="city" maxLength={100} />
      </label>
      <ErrorText error={create.error} />
      <button type="submit" disabled={create.isPending}>
        Добавить команду
      </button>
    </form>
  )
}
