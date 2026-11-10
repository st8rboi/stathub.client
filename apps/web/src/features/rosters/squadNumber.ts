/** Игровой номер из поля ввода: пусто или не число — без номера. */
export function parseSquadNumber(value: FormDataEntryValue | string | null): number | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}
