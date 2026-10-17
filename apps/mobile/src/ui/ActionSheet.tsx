import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { colors, fontSize, radius, spacing } from '../theme'

export type ActionSheetOption = {
  label: string
  description?: string
  destructive?: boolean
  onPress: () => void
}

type Props = {
  title: string
  message?: string
  options: ActionSheetOption[]
  onClose: () => void
}

/**
 * Нижний лист с вариантами — замена `Alert.alert`.
 *
 * На web `Alert.alert` в react-native-web не реализован (пустая функция), поэтому диалоги
 * на его основе в браузере молча не срабатывают. Modal в react-native-web работает,
 * а на телефоне выглядит как обычный нижний лист с крупными кнопками (судья в перчатке).
 *
 * Список опций прокручивается: в составе команды может быть больше двадцати игроков,
 * и все они должны быть доступны без «показать ещё».
 */
export function ActionSheet({ title, message, options, onClose }: Props) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <ScrollView style={styles.optionsScroll} contentContainerStyle={styles.optionsContent}>
            {options.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                onPress={option.onPress}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <Text style={[styles.optionLabel, option.destructive && styles.destructive]}>
                  {option.label}
                </Text>
                {option.description ? (
                  <Text style={styles.optionDescription}>{option.description}</Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
          >
            <Text style={styles.cancelLabel}>Отмена</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing(4),
    paddingBottom: spacing(8),
    gap: spacing(2),
    maxHeight: '80%',
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  message: {
    fontSize: fontSize.body,
    lineHeight: 20,
    color: colors.textMuted,
  },
  optionsScroll: {
    flexGrow: 0,
  },
  optionsContent: {
    gap: spacing(2),
  },
  option: {
    minHeight: 52,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing(4),
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  optionLabel: {
    fontSize: fontSize.input,
    fontWeight: '600',
    color: colors.text,
  },
  optionDescription: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  destructive: {
    color: colors.danger,
  },
  cancel: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  cancelLabel: {
    fontSize: fontSize.input,
    fontWeight: '600',
    color: colors.primary,
  },
  pressed: {
    opacity: 0.75,
  },
})
