export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function parseError(response: Response): Promise<never> {
  let message = `${response.status} ${response.statusText}`

  try {
    // Бэкенд отдаёт ProblemDetails: detail — бизнес-ошибка, errors — ошибки валидации модели
    const problem = await response.json()
    if (problem.errors) message = Object.values<string[]>(problem.errors).flat().join('; ')
    else message = problem.detail ?? problem.title ?? message
  } catch {
    // тело не JSON — оставляем статус
  }

  throw new ApiError(response.status, message)
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) await parseError(response)

  return response.status === 204 ? (undefined as T) : response.json()
}

/** Загрузка файла (логотип): FormData, Content-Type выставляет браузер сам. */
export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const form = new FormData()
  form.append('file', file)

  const response = await fetch(`/api${path}`, { method: 'POST', body: form })

  if (!response.ok) await parseError(response)

  return (await response.json()) as T
}
