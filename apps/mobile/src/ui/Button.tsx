import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'

import { colors, fontSize, radius, spacing } from '../theme'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

type Props = {
  title: string
  onPress: () => void
  variant?: ButtonVariant
  disabled?: boolean
  loading?: boolean
  large?: boolean
  /** Компактная кнопка для горизонтальных рядов, где важна ширина, а не высота. */
  compact?: boolean
  style?: StyleProp<ViewStyle>
}

const containerVariants: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
}

const labelVariants: Record<ButtonVariant, TextStyle> = {
  primary: { color: colors.onPrimary },
  secondary: { color: colors.text },
  danger: { color: colors.onDanger },
  ghost: { color: colors.primary },
}

/** Кнопка с площадкой под палец: судья нажимает её на поле, часто в перчатке и на бегу. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  large = false,
  compact = false,
  style,
}: Props) {
  const isDisabled = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        compact && styles.compact,
        containerVariants[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? colors.onPrimary : colors.primary}
        />
      ) : (
        <Text style={[styles.label, compact && styles.compactLabel, labelVariants[variant]]} numberOfLines={1}>
          {title}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    minHeight: 60,
  },
  compact: {
    minHeight: 46,
    paddingHorizontal: spacing(2),
  },
  compactLabel: {
    fontSize: 14,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: fontSize.input,
    fontWeight: '600',
  },
})
