import { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'

import { resolveMediaUrl } from '../api/client'
import { colors, fontSize } from '../theme'

const SIZE = 40

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Фото игрока в списке выбора: судья сверяет лицо, а не только фамилию.
 * Нет фото или оно не загрузилось (нет сети и не попало в кэш) — показываем инициалы.
 */
export function PlayerAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const uri = resolveMediaUrl(photoUrl)
  const [failedUri, setFailedUri] = useState<string | null>(null)

  if (uri && uri !== failedUri) {
    return (
      <Image
        source={{ uri }}
        style={styles.avatar}
        accessibilityIgnoresInvertColors
        onError={() => setFailedUri(uri)}
      />
    )
  }

  return (
    <View style={[styles.avatar, styles.placeholder]}>
      <Text style={styles.initials}>{initials(name)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.border,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textMuted,
  },
})
