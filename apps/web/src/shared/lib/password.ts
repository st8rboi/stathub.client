// Без похожих символов (0/O, 1/l/I), чтобы пароль было легко продиктовать.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Случайный пароль для выдачи аккаунта (криптостойкий генератор браузера). */
export function generatePassword(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint32Array(length))
  return [...bytes].map((value) => ALPHABET[value % ALPHABET.length]).join('')
}
