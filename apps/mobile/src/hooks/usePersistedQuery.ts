import { useQuery, type QueryKey } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { readCache, writeCache } from '../storage/offlineCache'

type Options<T> = {
  cacheKey: string
  queryKey: QueryKey
  queryFn: () => Promise<T>
  enabled?: boolean
  staleTime?: number
}

/**
 * Запрос, который переживает перезапуск приложения без сети: пока сервер не ответил,
 * экран видит последний сохранённый снимок, а каждый ответ сервера снимок обновляет.
 */
export function usePersistedQuery<T>({ cacheKey, queryKey, queryFn, enabled = true, staleTime }: Options<T>) {
  const [stored, setStored] = useState<{ key: string; value: T } | null>(null)

  useEffect(() => {
    if (!enabled) return

    let active = true
    void readCache<T>(cacheKey).then((value) => {
      if (active && value !== null) setStored({ key: cacheKey, value })
    })

    return () => {
      active = false
    }
  }, [cacheKey, enabled])

  const query = useQuery({ queryKey, queryFn, enabled, staleTime, retry: 1 })

  useEffect(() => {
    if (query.data !== undefined) void writeCache(cacheKey, query.data)
  }, [cacheKey, query.data])

  return {
    data: query.data ?? (stored?.key === cacheKey ? stored.value : undefined),
    error: query.error,
    isError: query.isError,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
  }
}
