import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useEffect, useRef } from 'react'

type Subscription = {
  /** Подписка на группу матча. */
  matchId?: string
  /** Подписка на этап: live-таблица меняется после каждого гола любого его матча. */
  stageId?: string
  /** false — не подключаться (например, этап ещё не загружен). */
  enabled?: boolean
}

/**
 * Однонаправленный SignalR-канал зрителя (documentation/doc.md §4).
 * Без matchId и stageId — подписка на ленту «сейчас играют».
 * Сообщения — только сигнал «данные изменились»: настоящий источник истины REST,
 * поэтому пуш ничего не ломает, если пришёл с опозданием или вовсе не пришёл.
 */
export function useRealtime({ matchId, stageId, enabled = true }: Subscription, onChange: () => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!enabled) return

    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/matches')
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    let disposed = false

    const subscribe = async () => {
      try {
        await connection.start()
        if (disposed) return

        if (matchId) await connection.invoke('SubscribeMatch', matchId)
        if (stageId) await connection.invoke('SubscribeStage', stageId)
        if (!matchId && !stageId) await connection.invoke('SubscribeLive')
      } catch {
        // Push недоступен (хаб не поднят, сеть) — страница обновится опросом.
      }
    }

    connection.on('MatchUpdated', () => onChangeRef.current())
    connection.on('StageUpdated', () => onChangeRef.current())
    connection.on('LiveFeedChanged', () => onChangeRef.current())
    connection.onreconnected(() => void subscribe())

    void subscribe()

    return () => {
      disposed = true
      void connection.stop()
    }
  }, [matchId, stageId, enabled])
}
