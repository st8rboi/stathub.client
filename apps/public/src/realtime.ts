import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useEffect, useRef } from 'react'

type Subscription = {
  /** Если задан — подписка на группу матча, иначе на ленту «сейчас играют». */
  matchId?: string
}

/**
 * Однонаправленный SignalR-канал зрителя (documentation/doc.md §4).
 * Сообщения — только сигнал «данные изменились»: настоящий источник истины REST,
 * поэтому пуш ничего не ломает, если пришёл с опозданием или вовсе не пришёл.
 */
export function useRealtime({ matchId }: Subscription, onChange: () => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
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
        else await connection.invoke('SubscribeLive')
      } catch {
        // Push недоступен (хаб не поднят, сеть) — страница обновится опросом.
      }
    }

    connection.on('MatchUpdated', () => onChangeRef.current())
    connection.on('LiveFeedChanged', () => onChangeRef.current())
    connection.onreconnected(() => void subscribe())

    void subscribe()

    return () => {
      disposed = true
      void connection.stop()
    }
  }, [matchId])
}
