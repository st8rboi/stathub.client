import { useState } from 'react'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useAccounts, useAssignments, useCreateAccount, useRevokeAssignment } from '../hooks'
import type { AccountRole } from '../types'

const roleLabels: Record<AccountRole, string> = {
  Organizer: 'Организатор',
  Admin: 'Администратор',
  Referee: 'Судья',
  Coach: 'Тренер',
}

/**
 * Аккаунты организации: организатор выдаёт логин и пароль судьям,
 * платформа — только организатору. Публичной регистрации нет.
 */
export default function AccountsPage() {
  const users = useAccounts()
  const assignments = useAssignments()
  const create = useCreateAccount()
  const revoke = useRevokeAssignment()

  const [formError, setFormError] = useState<string | null>(null)

  const onCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)

    const login = String(form.get('login') ?? '').trim()
    const displayName = String(form.get('displayName') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const role = String(form.get('role') ?? 'Referee') as AccountRole

    if (!login || !displayName || !password) {
      setFormError('Заполните логин, имя и пароль.')
      return
    }

    setFormError(null)
    create.mutate(
      { login, displayName, password, role, email: null },
      { onSuccess: () => formElement.reset() },
    )
  }

  const matchAssignments = (assignments.data ?? []).filter(
    (assignment) => assignment.scopeType === 'Match',
  )

  return (
    <>
      <h1>Судьи</h1>
      <p className="hint">
        Аккаунт создаётся с паролем, который вы передаёте судье. Назначать на матч можно здесь или
        прямо в списке матчей этапа.
      </p>

      <ErrorText error={users.error ?? assignments.error ?? create.error ?? revoke.error} />

      <h2>Аккаунты организации</h2>
      {users.isPending && <p>Загрузка…</p>}
      {users.data?.length === 0 && <p className="notice">Аккаунтов пока нет — создайте первого ниже.</p>}
      {users.data && users.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Логин</th>
              <th>Имя</th>
              <th>Роль</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {users.data.map((user) => (
              <tr key={user.id}>
                <td className="mono">{user.login}</td>
                <td>{user.displayName}</td>
                <td>{roleLabels[user.role]}</td>
                <td>{user.isActive ? 'активен' : 'отключён'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Новый аккаунт</h2>
      <form onSubmit={onCreate}>
        <label>
          Логин
          <input name="login" required maxLength={64} placeholder="например, sudya-ivanov" />
        </label>
        <label>
          Имя
          <input name="displayName" required maxLength={100} placeholder="Иванов Иван" />
        </label>
        <label>
          Пароль
          <input name="password" type="password" required minLength={8} placeholder="минимум 8 символов" />
        </label>
        <label>
          Роль
          <select name="role" defaultValue="Referee">
            <option value="Referee">Судья</option>
            <option value="Coach">Тренер</option>
            <option value="Admin">Администратор</option>
          </select>
        </label>
        {formError && <p className="error">{formError}</p>}
        <button type="submit" disabled={create.isPending}>
          Создать аккаунт
        </button>
        <p className="hint">
          Второго организатора выдаёт только платформа. Пароль передайте лично: судья может сменить
          его после входа.
        </p>
      </form>

      <h2>Назначения на матчи</h2>
      {matchAssignments.length === 0 ? (
        <p className="notice">
          Назначений пока нет. Откройте этап и нажмите «Назначить» в строке матча.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Судья</th>
              <th>Матч</th>
              <th>Выдано</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {matchAssignments.map((assignment) => (
              <tr key={assignment.id}>
                <td>{assignment.userDisplayName}</td>
                <td className="mono">{assignment.scopeId}</td>
                <td>{new Date(assignment.grantedAtUtc).toLocaleString('ru-RU')}</td>
                <td>
                  <button
                    type="button"
                    className="danger"
                    disabled={revoke.isPending}
                    onClick={() => {
                      if (confirm('Снять назначение?')) revoke.mutate(assignment.id)
                    }}
                  >
                    Снять
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
