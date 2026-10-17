/**
 * HTTP-клиент судейского приложения.
 *
 * Отличия от админского клиента (apps/web): адрес сервера настраивается на устройстве
 * (судья в поле не ходит через dev-прокси), а любая сетевая ошибка приводится
 * к понятному русскому сообщению — судья не должен читать `TypeError: Network request failed`.
 */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }

  /** status = 0 — запрос не дошёл до сервера (нет сети, неверный адрес, таймаут). */
  get isNetworkError(): boolean {
    return this.status === 0
  }
}

const REQUEST_TIMEOUT_MS = 10_000

let baseUrl = ''

export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  return withScheme.replace(/\/+$/, '')
}

export function setApiBaseUrl(value: string): void {
  baseUrl = normalizeBaseUrl(value)
}

export function getApiBaseUrl(): string {
  return baseUrl
}

type ProblemDetails = {
  detail?: string
  title?: string
  errors?: Record<string, string[]>
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const problem = (await response.json()) as ProblemDetails
    // Ошибки валидации модели приходят в errors, бизнес-ошибки — в detail (см. GlobalExceptionHandler).
    if (problem.errors) {
      return Object.values(problem.errors).flat().join('; ')
    }
    return problem.detail ?? problem.title ?? `Ошибка ${response.status}`
  } catch {
    return `Ошибка ${response.status}`
  }
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!baseUrl) {
    throw new ApiError(0, 'Не задан адрес сервера. Откройте «Настройки» и укажите адрес.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers:
        body === undefined
          ? { Accept: 'application/json' }
          : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    throw new ApiError(
      0,
      controller.signal.aborted
        ? 'Сервер не ответил за 10 секунд. Проверьте адрес и сеть.'
        : 'Нет связи с сервером. Проверьте адрес в настройках и подключение к сети.',
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
