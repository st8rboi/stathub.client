import { clearTokens, getAccessToken, getTokens, setTokens } from './storage'

export class ApiError extends Error {
  /** HTTP-статус; 0 — запрос не дошёл до сервера (нет сети). */
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Сессия истекла — войдите заново.',
  403: 'Недостаточно прав для этого действия.',
  404: 'Не найдено: возможно, запись уже удалили.',
  413: 'Файл или запрос слишком большой.',
  429: 'Слишком много запросов. Повторите чуть позже.',
}

/** Текст ошибки, когда сервер не прислал описания (пустое тело у 401/403, ответ прокси и т. п.). */
function fallbackMessage(status: number): string {
  if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status]
  if (status >= 500) return 'Сервер временно недоступен. Попробуйте ещё раз.'
  return `Не удалось выполнить запрос (код ${status}).`
}

async function parseError(response: Response): Promise<never> {
  let message = fallbackMessage(response.status)

  try {
    // Бэкенд отдаёт ProblemDetails: detail — бизнес-ошибка, errors — ошибки валидации модели.
    // title не берём: там технический английский заголовок («Forbidden», «Bad Request»).
    const problem = await response.json()
    const validation = problem.errors ? Object.values<string[]>(problem.errors).flat().join('; ') : ''
    message = validation || problem.detail || message
  } catch {
    // тело не JSON — оставляем текст по статусу
  }

  throw new ApiError(response.status, message)
}

/** fetch, у которого обрыв сети — понятная ошибка, а не «Failed to fetch». */
async function doFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`/api${path}`, init)
  } catch {
    throw new ApiError(0, 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.')
  }
}

async function readBody<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T
  // Пустое тело при 200/201 — не ошибка разбора JSON.
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// ---------- Сессия ----------

type SessionExpiredListener = () => void

const sessionExpiredListeners = new Set<SessionExpiredListener>()

/**
 * Подписка на окончательную потерю сессии (refresh-токен отклонён): приложение должно
 * показать экран входа, а не оставлять пользователя на странице, где каждый запрос даёт 401.
 */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener)
  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

function expireSession(): void {
  clearTokens()
  for (const listener of sessionExpiredListeners) listener()
}

/** Один общий refresh: параллельные 401 не должны порождать несколько обновлений сессии. */
let refreshInFlight: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  const tokens = getTokens()
  if (!tokens) {
    // Токены стёрты (например, выход в другой вкладке) — обновлять нечем.
    expireSession()
    return false
  }

  refreshInFlight ??= (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      })

      if (!response.ok) {
        // Сессию закрываем, только если сервер отклонил сам токен. Сбой сервера (5xx)
        // или ограничение частоты (429) — временные: токены ещё пригодятся.
        const rejected = response.status >= 400 && response.status < 500 && response.status !== 429
        if (rejected) expireSession()
        return false
      }

      const refreshed = (await response.json()) as { accessToken: string; refreshToken: string }
      setTokens({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken })
      return true
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

function authHeaders(): Record<string, string> {
  const accessToken = getAccessToken()
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
}

function send(method: string, path: string, body?: unknown): Promise<Response> {
  const headers = authHeaders()
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  return doFetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/**
 * Запрос к API с авторизацией. На 401 один раз пробуем обновить сессию по refresh-токену
 * и повторяем запрос: судья/организатор не должен вылетать из-за истёкшего access-токена.
 */
export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response = await send(method, path, body)

  if (response.status === 401 && (await refreshSession())) {
    response = await send(method, path, body)
  }

  if (!response.ok) await parseError(response)

  return readBody<T>(response)
}

/** POST без авторизации (вход, выход): 401 здесь — ответ по существу, сессию не обновляем. */
export async function postAnonymous<T>(path: string, body: unknown): Promise<T> {
  const response = await doFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) await parseError(response)

  return readBody<T>(response)
}

/** Загрузка файла (логотип): FormData, Content-Type выставляет браузер сам. */
export async function uploadFile<T>(path: string, file: File, retry = true): Promise<T> {
  const form = new FormData()
  form.append('file', file)

  const response = await doFetch(path, { method: 'POST', headers: authHeaders(), body: form })

  if (response.status === 401 && retry && (await refreshSession()))
    return uploadFile<T>(path, file, false)

  if (!response.ok) await parseError(response)

  return readBody<T>(response)
}

/** Идентификаторы в query-строке режем на части: длинный URL отклонит прокси, а сервер ограничивает их число. */
export const IDS_CHUNK_SIZE = 100

export function chunkIds(ids: string[]): string[][] {
  const chunks: string[][] = []
  for (let index = 0; index < ids.length; index += IDS_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + IDS_CHUNK_SIZE))
  }
  return chunks
}
