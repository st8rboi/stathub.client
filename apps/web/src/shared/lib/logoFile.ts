export const LOGO_MAX_BYTES = 2 * 1024 * 1024

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/**
 * Проверка файла до отправки: без запроса на сервер показывает судье/организатору
 * понятную причину вместо технического «Request body too large».
 */
export function validateLogoFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Поддерживаются только PNG, JPEG и WebP.'
  }

  if (file.size > LOGO_MAX_BYTES) {
    return `Файл ${(file.size / 1024 / 1024).toFixed(1)} МБ — больше лимита 2 МБ. Сожмите картинку.`
  }

  return null
}
