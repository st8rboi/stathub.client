import { useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'

import { useAuth } from '../src/auth/AuthProvider'
import { useSettings } from '../src/settings/SettingsProvider'
import { colors, fontSize, spacing } from '../src/theme'
import { Button } from '../src/ui/Button'
import { Card, MutedText, SectionTitle } from '../src/ui/Card'
import { Field } from '../src/ui/Field'
import { Screen } from '../src/ui/Screen'

/**
 * Вход судьи. Публичной регистрации нет: логин и пароль выдаёт организатор.
 * Адрес сервера тоже можно поправить здесь — судья впервые настраивает телефон именно на этом экране.
 */
export default function LoginScreen() {
  const router = useRouter()
  const { baseUrl, saveBaseUrl } = useSettings()
  const { login } = useAuth()

  const [serverValue, setServerValue] = useState(baseUrl)
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)

    try {
      await saveBaseUrl(serverValue)
      await login(loginValue.trim(), password)
      router.replace('/')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Card>
          <SectionTitle>Вход</SectionTitle>
          <MutedText>
            Логин и пароль выдаёт организатор лиги. Если вы ещё не получали доступ — свяжитесь с ним.
          </MutedText>

          <Field
            label="Адрес сервера"
            value={serverValue}
            onChangeText={setServerValue}
            placeholder="http://192.168.1.10:5248"
            keyboardType="url"
            autoCapitalize="none"
          />

          <Field
            label="Логин"
            value={loginValue}
            onChangeText={setLoginValue}
            placeholder="например, sudya-ivanov"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Field
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            placeholder="пароль от аккаунта"
            secureTextEntry
            autoCapitalize="none"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={busy ? 'Входим…' : 'Войти'}
            large
            loading={busy}
            onPress={() => void submit()}
          />

          <Button title="Сервер и проверка связи" variant="ghost" onPress={() => router.push('/settings')} />
        </Card>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Stathub · судейское приложение</Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  error: {
    fontSize: fontSize.body,
    color: colors.danger,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing(2),
  },
  footerText: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
})
