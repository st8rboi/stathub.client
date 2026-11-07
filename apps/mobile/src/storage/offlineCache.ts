import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Снимки данных с сервера для работы без сети: состояние матча, составы, дисквалификации,
 * названия команд и список назначений. Это кэш, а не источник истины: при появлении связи
 * он перезаписывается ответом сервера. Офлайн-очередь событий живёт отдельно (см. outbox).
 */
const PREFIX = '@stathub/cache/'

export const cacheKeys = {
  matchState: (matchId: string) => `matchState/${matchId}`,
  matchRosters: (matchId: string) => `matchRosters/${matchId}`,
  stageBans: (stageId: string) => `stageBans/${stageId}`,
  teamNames: (ids: string[]) => `teamNames/${[...ids].sort().join(',')}`,
  myMatches: () => 'referee/matches',
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Кэш не критичен: при ошибке записи экран просто покажет данные с сервера.
  }
}

/** При выходе из аккаунта снимки удаляются; неотправленная очередь остаётся. */
export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys()
    await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(PREFIX)))
  } catch {
    // см. writeCache
  }
}
