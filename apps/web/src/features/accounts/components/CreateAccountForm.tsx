import { useId, useState, type SubmitEvent } from 'react'
import { generatePassword } from '@/shared/lib/password'
import { CopyField } from '@/shared/ui/CopyField'
import { ErrorText } from '@/shared/ui/ErrorText'
import { useCreateAccount } from '../hooks'
import { roleLabels } from '../labels'
import type { AccountRole } from '../types'

interface Credentials {
  displayName: string
  login: string
  password: string
}

/**
 * Создание аккаунта (в модальном окне). После создания показываем логин и пароль —
 * их нужно передать человеку: публичной регистрации нет, пароль больше нигде не увидеть.
 */
export function CreateAccountForm({
  roles,
  onDone,
}: {
  /** Роли на выбор; если одна — поле роли не показывается. */
  roles: AccountRole[]
  onDone: () => void
}) {
  const create = useCreateAccount()
  const [password, setPassword] = useState(() => generatePassword())
  const [showPassword, setShowPassword] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [created, setCreated] = useState<Credentials | null>(null)
  const passwordId = useId()

  if (created) {
    return (
      <div>
        <p className="success-text">Аккаунт «{created.displayName}» создан.</p>
        <p className="hint">Передайте данные для входа лично. Пароль больше нигде не будет показан.</p>
        <CopyField label="Логин" value={created.login} />
        <CopyField label="Пароль" value={created.password} />
        <div className="actions credentials-actions">
          <button type="button" onClick={onDone}>
            Готово
          </button>
        </div>
      </div>
    )
  }

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    const login = String(form.get('login') ?? '').trim()
    const displayName = String(form.get('displayName') ?? '').trim()
    const role = (String(form.get('role') ?? '') || roles[0]) as AccountRole

    if (!login || !displayName || !password) {
      setFormError('Заполните имя, логин и пароль.')
      return
    }

    setFormError(null)
    create.mutate(
      { login, displayName, password, role, email: null },
      { onSuccess: () => setCreated({ displayName, login, password }) },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Имя
        <input name="displayName" required maxLength={100} placeholder="Иванов Иван" autoFocus />
      </label>
      <label>
        Логин
        <input name="login" required maxLength={64} placeholder="например, ivanov" autoComplete="off" />
      </label>
      <div className="field">
        <label htmlFor={passwordId}>Пароль</label>
        <div className="swap-row">
          <input
            id={passwordId}
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
          <button type="button" className="secondary" onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? 'Скрыть' : 'Показать'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setPassword(generatePassword())
              setShowPassword(true)
            }}
          >
            Новый
          </button>
        </div>
        <span className="hint">Минимум 8 символов. Пароль сгенерирован — можно оставить или задать свой.</span>
      </div>
      {roles.length > 1 && (
        <label>
          Роль
          <select name="role" defaultValue={roles[0]}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </label>
      )}
      {formError && <p className="error">{formError}</p>}
      <ErrorText error={create.error} />
      <div className="actions">
        <button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Создаём…' : 'Создать аккаунт'}
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          Отмена
        </button>
      </div>
    </form>
  )
}
