import { StyleSheet, Text, View } from 'react-native'

import type { StatusTone } from '../match/status'
import { colors, fontSize, radius, spacing } from '../theme'

const toneStyles: Record<StatusTone, { backgroundColor: string; color: string }> = {
  neutral: { backgroundColor: colors.surfaceMuted, color: colors.textMuted },
  live: { backgroundColor: colors.successSurface, color: colors.success },
  pause: { backgroundColor: colors.warningSurface, color: colors.warning },
  done: { backgroundColor: colors.surfaceMuted, color: colors.textMuted },
}

export function Badge({ label, tone }: { label: string; tone: StatusTone }) {
  const colorsForTone = toneStyles[tone]

  return (
    <View style={[styles.badge, { backgroundColor: colorsForTone.backgroundColor }]}>
      <Text style={[styles.label, { color: colorsForTone.color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
})
