import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { Match } from '../api/types'
import { formatDateTime, shortId } from '../match/format'
import { statusLabels, statusTones } from '../match/status'
import { Badge } from '../ui/Badge'
import { colors, fontSize, radius, spacing } from '../theme'

type Props = {
  match: Match
  onPress: () => void
  /** Дополнительная строка под счётом (например, дата в списке недавних). */
  meta?: string
}

/** Строка матча в списках: команды, счёт и статус. */
export function MatchRow({ match, onPress, meta }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {shortId(match.homeTeamId)} — {shortId(match.awayTeamId)}
        </Text>
        <Badge label={statusLabels[match.status]} tone={statusTones[match.status]} />
      </View>
      <Text style={styles.meta}>
        {match.homeScore}:{match.awayScore} · {meta ?? formatDateTime(match.scheduledTimeUtc)}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: spacing(2),
    padding: spacing(3),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.75,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
})
