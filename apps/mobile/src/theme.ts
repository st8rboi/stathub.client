/**
 * Тема судейского приложения: светлая, высокий контраст и крупные элементы.
 * Судья работает одной рукой на поле, поэтому размеры намеренно больше обычных.
 */
export const colors = {
  background: '#F2F5FA',
  surface: '#FFFFFF',
  surfaceMuted: '#E8EEF7',
  border: '#D5DFEC',
  text: '#0F172A',
  textMuted: '#5B6B82',
  primary: '#1D5BFF',
  primaryPressed: '#1646C4',
  onPrimary: '#FFFFFF',
  success: '#0F7A52',
  successSurface: '#E1F3EB',
  warning: '#9A5B00',
  warningSurface: '#FBEFD9',
  danger: '#B0252B',
  dangerSurface: '#FBE4E5',
  onDanger: '#FFFFFF',
  shadow: '#0F172A',
} as const

export const spacing = (steps: number) => steps * 4

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const

export const fontSize = {
  caption: 12,
  body: 15,
  input: 16,
  title: 18,
  big: 30,
  clock: 46,
} as const
