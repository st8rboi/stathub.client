import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from './authContext'

/**
 * Вход организатора/администратора. Публичной регистрации нет: логин и пароль
 * выдаются административно, поэтому на странице нет ссылок на «создать аккаунт».
 */
export default function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated') return <Navigate to="/" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      await login(loginValue.trim(), password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={(event) => void submit(event)}>
        <h1>Вход в админку</h1>
        <p className="hint">Логин и пароль выдаёт организатор или платформа.</p>

        <label>
          Логин
          <input
            value={loginValue}
            onChange={(event) => setLoginValue(event.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={busy || !loginValue.trim() || !password}>
          {busy ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </main>
  )
}
