import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useRef, useState } from 'react'

import type { Match } from '../api/types'

/**
 * Секундомер периода.
 *
 * Сервер хранит только `PeriodStartedAtUtc` и статус, без времени пауз, поэтому
 * «чистое» игровое время приходится считать на клиенте: длительность пауз
 * накапливается в AsyncStorage по ключу «матч + период». Это осознанный компромисс
 * до появления в модуле Matches учёта остановок; логика помечена как временная.
 */
type PauseState = {
  pausedAtMs: number | null
  accumulatedMs: number
}

const EMPTY_PAUSE: PauseState = { pausedAtMs: null, accumulatedMs: 0 }

const pauseStateKey = (matchId: string, period: number) => `@stathub/clock/${matchId}/${period}`

async function readPauseState(matchId: string, period: number): Promise<PauseState> {
  try {
    const raw = await AsyncStorage.getItem(pauseStateKey(matchId, period))
    if (!raw) return EMPTY_PAUSE

    const parsed = JSON.parse(raw) as Partial<PauseState>
    return {
      pausedAtMs: typeof parsed.pausedAtMs === 'number' ? parsed.pausedAtMs : null,
      accumulatedMs: typeof parsed.accumulatedMs === 'number' ? parsed.accumulatedMs : 0,
    }
  } catch {
    return EMPTY_PAUSE
  }
}

async function writePauseState(matchId: string, period: number, state: PauseState): Promise<void> {
  try {
    await AsyncStorage.setItem(pauseStateKey(matchId, period), JSON.stringify(state))
  } catch {
    // Кэш паузы не критичен: при ошибке записи секундомер просто учтёт паузу как игровое время.
  }
}

function computeElapsedMs(match: Match, pause: PauseState, nowMs: number): number | null {
  if (!match.periodStartedAtUtc) return 0

  // Время финального свистка сервер не хранит, поэтому для завершённого матча
  // секундомер не показываем, а не гоним его дальше реального времени.
  if (match.status === 'Finished' || match.status === 'Cancelled') return null

  const startedMs = new Date(match.periodStartedAtUtc).getTime()
  if (Number.isNaN(startedMs)) return 0

  // Во время паузы часы «замирают» на моменте остановки.
  const endMs = pause.pausedAtMs ?? nowMs
  return Math.max(0, endMs - startedMs - pause.accumulatedMs)
}

export function useMatchClock(match: Match | undefined) {
  const matchId = match?.id ?? ''
  const period = match?.currentPeriod ?? 0

  const [nowMs, setNowMs] = useState(() => Date.now())
  const [pause, setPause] = useState<PauseState>(EMPTY_PAUSE)
  const [pauseLoaded, setPauseLoaded] = useState(false)

  const pauseRef = useRef(pause)
  pauseRef.current = pause

  useEffect(() => {
    if (!match || match.status !== 'InProgress') return

    setNowMs(Date.now())
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [match?.id, match?.status])

  useEffect(() => {
    if (!matchId || period <= 0) {
      setPause(EMPTY_PAUSE)
      setPauseLoaded(true)
      return
    }

    let active = true
    setPauseLoaded(false)

    void readPauseState(matchId, period).then((state) => {
      if (!active) return
      setPause(state)
      setPauseLoaded(true)
    })

    return () => {
      active = false
    }
  }, [matchId, period])

  // Переходы статуса пишут границы паузы. Ждём загрузки состояния, иначе первый же
  // рендер идущего матча обнулил бы сохранённое время паузы.
  useEffect(() => {
    if (!match || period <= 0 || !pauseLoaded) return

    const current = pauseRef.current

    if (match.status === 'Pause' && current.pausedAtMs === null) {
      const next: PauseState = { pausedAtMs: Date.now(), accumulatedMs: current.accumulatedMs }
      setPause(next)
      void writePauseState(match.id, period, next)
      return
    }

    if (match.status === 'InProgress' && current.pausedAtMs !== null) {
      const next: PauseState = {
        pausedAtMs: null,
        accumulatedMs: current.accumulatedMs + Math.max(0, Date.now() - current.pausedAtMs),
      }
      setPause(next)
      void writePauseState(match.id, period, next)
    }
  }, [match?.id, match?.status, period, pauseLoaded])

  return {
    elapsedMs: match ? computeElapsedMs(match, pause, nowMs) : 0,
    isRunning: match?.status === 'InProgress',
  }
}
