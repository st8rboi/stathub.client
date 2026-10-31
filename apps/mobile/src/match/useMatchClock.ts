import { useEffect, useState } from 'react'

import { serverNowMs } from '../api/serverClock'
import type { Match } from '../api/types'

/** Секундомер периода: паузы теперь учитывает сервер, поэтому часы — чистая проекция матча. */
function computeElapsedMs(match: Match, nowMs: number): number | null {
  if (match.status === 'Finished' || match.status === 'Cancelled') return null
  if (!match.periodStartedAtUtc) return 0

  const startedMs = new Date(match.periodStartedAtUtc).getTime()
  if (Number.isNaN(startedMs)) return 0

  // Во время паузы часы «замирают» на моменте остановки.
  const endMs = match.pausedAtUtc ? new Date(match.pausedAtUtc).getTime() : nowMs
  return Math.max(0, endMs - startedMs - match.periodPausedMilliseconds)
}

export function useMatchClock(match: Match | undefined) {
  const [nowMs, setNowMs] = useState(serverNowMs)

  useEffect(() => {
    if (!match || match.status !== 'InProgress') return

    setNowMs(serverNowMs())
    const timer = setInterval(() => setNowMs(serverNowMs()), 1000)
    return () => clearInterval(timer)
  }, [match?.id, match?.status])

  return {
    elapsedMs: match ? computeElapsedMs(match, nowMs) : 0,
    isRunning: match?.status === 'InProgress',
  }
}
