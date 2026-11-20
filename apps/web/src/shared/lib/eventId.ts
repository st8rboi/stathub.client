/**
 * UUID события протокола: его генерирует клиент, сервер по нему отбрасывает повторы.
 * randomUUID есть только в защищённом контексте (https/localhost), а админка открывается
 * и по http — тогда хватает Math.random: криптостойкость не нужна, важно не повторить Id.
 */
export function createEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16)
  })
}
