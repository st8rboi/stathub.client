export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
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

  return response.status === 204 ? (undefined as T) : response.json()
}
