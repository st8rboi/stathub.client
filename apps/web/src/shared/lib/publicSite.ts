/** Порт dev-сервера публичного сайта (apps/public/vite.config.ts). */
const PUBLIC_DEV_PORT = 5174

/**
 * Адрес публичного сайта, вычисленный из адреса админки:
 * admin.статхаб.рф → статхаб.рф; по IP админка на :8443/:8081, сайт — на стандартном порту;
 * локально — dev-сервер публичного сайта.
 */
export function publicSiteOrigin(): string {
  const { protocol, hostname } = window.location

  if (hostname.startsWith('admin.')) return `${protocol}//${hostname.slice('admin.'.length)}`
  if (hostname === 'localhost' || hostname === '127.0.0.1') return `${protocol}//${hostname}:${PUBLIC_DEV_PORT}`
  return `${protocol}//${hostname}`
}

/** Ссылка для приложения трансляции: оверлей ищет матч по короткому номеру. */
export const overlayUrl = (matchNumber: number) => `${publicSiteOrigin()}/overlay.html?match=${matchNumber}`

/** Копирует текст в буфер. Clipboard API есть только на HTTPS и localhost — иначе false. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // нет разрешения
  }
  return false
}
