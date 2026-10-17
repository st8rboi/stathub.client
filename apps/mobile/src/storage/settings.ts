import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

export const API_BASE_URL_KEY = '@stathub/apiBaseUrl'

/**
 * Адрес сервера по умолчанию (профиль `http` из launchSettings.json — порт 5248).
 * Android-эмулятор обращается к машине разработчика через 10.0.2.2,
 * физическое устройство — по LAN-адресу, который судья вводит в настройках.
 */
export const defaultApiBaseUrl = Platform.select({
  android: 'http://10.0.2.2:5248',
  default: 'http://localhost:5248',
}) as string

export async function loadApiBaseUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem(API_BASE_URL_KEY)
  return stored && stored.trim() ? stored.trim() : defaultApiBaseUrl
}

export async function saveApiBaseUrl(value: string): Promise<void> {
  await AsyncStorage.setItem(API_BASE_URL_KEY, value)
}
