import { useEffect, useState } from 'react'

/** Значение, которое обновляется только после паузы во вводе — чтобы поиск не слал запрос на каждую букву. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
