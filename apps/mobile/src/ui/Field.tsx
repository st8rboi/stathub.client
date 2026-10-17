import type { KeyboardTypeOptions } from 'react-native'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { colors, fontSize, radius, spacing } from '../theme'

type Props = {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  autoCapitalize?: 'none' | 'sentences'
  keyboardType?: KeyboardTypeOptions
  multiline?: boolean
  error?: string | null
  hint?: string
  editable?: boolean
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
  keyboardType,
  multiline = false,
  error,
  hint,
  editable = true,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        style={[styles.input, multiline && styles.multiline, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing(1),
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    fontSize: fontSize.input,
    color: colors.text,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontSize: fontSize.caption,
    color: colors.danger,
  },
  hint: {
    fontSize: fontSize.caption,
    lineHeight: 17,
    color: colors.textMuted,
  },
})
