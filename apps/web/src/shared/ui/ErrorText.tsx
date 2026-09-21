import { errorMessage } from '@/shared/lib/errors'

// Показывает ошибку запроса/мутации (или ничего, если ошибки нет)
export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null
  return <p className="error">{errorMessage(error)}</p>
}
