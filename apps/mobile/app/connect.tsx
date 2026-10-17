import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'

import { extractUuid } from '../src/match/format'
import { colors, fontSize } from '../src/theme'
import { Button } from '../src/ui/Button'
import { Card, MutedText, SectionTitle } from '../src/ui/Card'
import { Field } from '../src/ui/Field'
import { Screen } from '../src/ui/Screen'

export default function ConnectScreen() {
  const router = useRouter()

  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  const [stageId, setStageId] = useState('')
  const [stageError, setStageError] = useState<string | null>(null)

  const openByCode = () => {
    const uuid = extractUuid(code)
    if (!uuid) {
      setCodeError('Код матча — это GUID вида 3f2a1c4e-…-9b7d. Проверьте ввод или отсканируйте QR.')
      return
    }

    setCodeError(null)
    router.push(`/match/${uuid}`)
  }

  const openStage = () => {
    const uuid = extractUuid(stageId)
    if (!uuid) {
      setStageError('Идентификатор этапа — тоже GUID. Его присылает организатор турнира.')
      return
    }

    setStageError(null)
    router.push(`/stage/${uuid}`)
  }

  return (
    <Screen>
      <Card>
        <SectionTitle>Код матча</SectionTitle>
        <MutedText>
          Организатор присылает код матча вместе с назначением. Можно вставить код целиком или ссылку,
          в которой он есть.
        </MutedText>
        <Field
          label="Код матча"
          value={code}
          onChangeText={(value) => {
            setCode(value)
            setCodeError(null)
          }}
          placeholder="3f2a1c4e-8b2d-4e0e-9b7d-2c1f4a5e6d70"
          error={codeError}
        />
        <Button title="Подключиться" onPress={openByCode} />
        <Button title="Сканировать QR-код" variant="secondary" onPress={() => router.push('/scan')} />
      </Card>

      <Card>
        <SectionTitle>Этап турнира</SectionTitle>
        <MutedText>
          Если код матча неизвестен, откройте список матчей этапа и выберите нужный. Список отдаёт
          сервер (GET /matches?stageId=…).
        </MutedText>
        <Field
          label="Идентификатор этапа"
          value={stageId}
          onChangeText={(value) => {
            setStageId(value)
            setStageError(null)
          }}
          placeholder="9bb13469-82be-418d-b820-483ccd8965eb"
          error={stageError}
        />
        <Button title="Показать матчи этапа" variant="secondary" onPress={openStage} />
      </Card>

      <Text style={styles.footer}>
        Названия команд и турниров появятся, когда заработают модули Teams и Identity: сейчас сервер хранит
        только идентификаторы.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  footer: {
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.textMuted,
    paddingHorizontal: 4,
  },
})
