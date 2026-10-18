export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type ProblemDetails = {
  detail?: string
  title?: string
}

/** Публичный клиент: только GET, всегда через dev-прокси /api. */
export async function request<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`)

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`

    try {
      const problem = (await response.json()) as ProblemDetails
      message = problem.detail ?? problem.title ?? message
    } catch {
      // тело не JSON — оставляем статус
    }

    throw new ApiError(response.status, message)
  }

  return (await response.json()) as T
}
