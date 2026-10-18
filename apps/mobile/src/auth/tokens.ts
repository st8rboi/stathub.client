import AsyncStorage from '@react-native-async-storage/async-storage'

const ACCESS_KEY = '@stathub/accessToken'
const REFRESH_KEY = '@stathub/refreshToken'

let cachedAccessToken: string | null = null

/** Токен в памяти: HTTP-клиент читает его синхронно на каждом запросе. */
export function getCachedAccessToken(): string | null {
  return cachedAccessToken
}

export function setCachedAccessToken(token: string | null): void {
  cachedAccessToken = token
}

export async function loadTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(ACCESS_KEY),
    AsyncStorage.getItem(REFRESH_KEY),
  ])

  if (!accessToken || !refreshToken) {
    cachedAccessToken = null
    return null
  }

  cachedAccessToken = accessToken
  return { accessToken, refreshToken }
}

export async function saveTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
  cachedAccessToken = tokens.accessToken
  await Promise.all([
    AsyncStorage.setItem(ACCESS_KEY, tokens.accessToken),
    AsyncStorage.setItem(REFRESH_KEY, tokens.refreshToken),
  ])
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY)
}

export async function clearTokens(): Promise<void> {
  cachedAccessToken = null
  await Promise.all([AsyncStorage.removeItem(ACCESS_KEY), AsyncStorage.removeItem(REFRESH_KEY)])
}
