import type { SubmitEvent } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useCreatePlayer } from '../hooks'

export function CreatePlayerForm() {
  const create = useCreatePlayer()

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formElement = e.currentTarget
    const form = new FormData(formElement)

    create.mutate(
      {
        fullName: String(form.get('fullName')),
        birthDate: String(form.get('birthDate')) || null,
      },
      { onSuccess: () => formElement.reset() },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        ФИО
        <input name="fullName" required maxLength={200} placeholder="Иванов Иван Иванович" />
      </label>
      <label>
        Дата рождения (помогает отличить тёзок)
        <input name="birthDate" type="date" />
      </label>
      <ErrorText error={create.error} />
      <button type="submit" disabled={create.isPending}>
        Добавить игрока
      </button>
    </form>
  )
}
