import type { ReactNode } from 'react'
import { RefreshControl, ScrollView, StyleSheet } from 'react-native'

import { colors, spacing } from '../theme'

type Props = {
  children: ReactNode
  onRefresh?: () => void
  refreshing?: boolean
}

export function Screen({ children, onRefresh, refreshing = false }: Props) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing(4),
    paddingBottom: spacing(10),
    gap: spacing(3),
  },
})
