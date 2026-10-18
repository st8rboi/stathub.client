import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { matchesApi, pingServer } from '../src/api/matches'
import { getApiBaseUrl } from '../src/api/client'
import { useSettings } from '../src/settings/SettingsProvider'
import { colors, fontSize, spacing } from '../src/theme'
import { Button } from '../src/ui/Button'
import { Card, MutedText, SectionTitle } from '../src/ui/Card'
import { Field } from '../src/ui/Field'
import { Screen } from '../src/ui/Screen'

type CheckState = { kind: 'idle' | 'checking' | 'ok' | 'error'; message?: string }

export default function SettingsScreen() {
  const router = useRouter()
  const { baseUrl, saveBaseUrl } = useSettings()

  const [value, setValue] = useState(baseUrl)
  const [state, setState] = useState<CheckState>({ kind: 'idle' })
  const [diagnostics, setDiagnostics] = useState<string | null>(null)

  const save = async () => {
    await saveBaseUrl(value)
    setState({ kind: 'ok', message: 'Адрес сохранён.' })
  }

  const saveAndCheck = async () => {
    setState({ kind: 'checking', message: 'Проверяем связь…' })

    await saveBaseUrl(value)
    try {
      await pingServer()
      setState({ kind: 'ok', message: 'Сервер отвечает.' })
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'Сервер не ответил.' })
    }
  }

  const showDiagnostics = async () => {
    const active = getApiBaseUrl()
    let matchCount = 'не удалось получить'
    try {
      const matches = await matchesApi.listByStage('00000000-0000-0000-0000-000000000000')
      matchCount = `${matches.length}`
    } catch {
      // Ожидаемо: пустой stageId вернёт 400, но это и значит, что сервер на связи.
      matchCount = 'сервер ответил ошибкой (это нормально для пустого этапа)'
    }

    // Alert на web не реализован, поэтому диагностика выводится текстом на экране.
    setDiagnostics(`Адрес: ${active}\nСписок матчей: ${matchCount}`)
  }

  return (
    <Screen>
      <Card>
        <SectionTitle>Адрес сервера</SectionTitle>
        <MutedText>
          Запросы идут напрямую на WebApi, без dev-прокси. Для эмулятора Android это
          http://10.0.2.2:5248, для телефона — LAN-адрес компьютера, например http://192.168.1.10:5248.
          Телефон и компьютер должны быть в одной сети.
        </MutedText>
        <Field
          label="Адрес"
          value={value}
          onChangeText={setValue}
          placeholder="http://192.168.1.10:5248"
          keyboardType="url"
        />
        <Button title="Сохранить" onPress={() => void save()} />
        <Button
          title="Сохранить и проверить связь"
          variant="secondary"
          loading={state.kind === 'checking'}
          onPress={() => void saveAndCheck()}
        />
        {state.message ? (
          <Text style={[styles.status, state.kind === 'error' ? styles.statusError : styles.statusOk]}>
            {state.message}
          </Text>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Проверка</SectionTitle>
        <MutedText>Показать текущий адрес и ответ сервера на запрос списка матчей.</MutedText>
        <Button title="Диагностика" variant="secondary" onPress={() => void showDiagnostics()} />
        {diagnostics ? <Text style={styles.diagnostics}>{diagnostics}</Text> : null}
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Сервер запускается командой dotnet run --project src/Stathub.WebApi и слушает порт 5248
          (http-профиль).
        </Text>
        <Button title="Готово" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  status: {
    fontSize: fontSize.body,
    lineHeight: 20,
  },
  statusOk: {
    color: colors.success,
  },
  statusError: {
    color: colors.danger,
  },
  diagnostics: {
    fontSize: fontSize.body,
    lineHeight: 20,
    color: colors.text,
  },
  footer: {
    gap: spacing(2),
  },
  footerText: {
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.textMuted,
  },
})
