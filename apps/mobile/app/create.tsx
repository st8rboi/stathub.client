import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'

import { matchesApi } from '../src/api/matches'
import { currentDateInput, currentTimeInput, isUuid, parseLocalDateTime } from '../src/match/format'
import { colors, fontSize } from '../src/theme'
import { Button } from '../src/ui/Button'
import { Card, MutedText, SectionTitle } from '../src/ui/Card'
import { Field } from '../src/ui/Field'
import { Screen } from '../src/ui/Screen'

type FormErrors = {
  stageId?: string
  homeTeamId?: string
  awayTeamId?: string
  schedule?: string
}

export default function CreateMatchScreen() {
  const router = useRouter()

  const [stageId, setStageId] = useState('')
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')
  const [date, setDate] = useState(currentDateInput())
  const [time, setTime] = useState(currentTimeInput())
  const [errors, setErrors] = useState<FormErrors>({})

  const mutation = useMutation({
    mutationFn: matchesApi.createMatch,
    onSuccess: (result) => router.replace(`/match/${result.id}`),
  })

  const submit = () => {
    const nextErrors: FormErrors = {}
    const scheduled = parseLocalDateTime(date, time)

    if (!isUuid(stageId)) nextErrors.stageId = 'Нужен GUID этапа'
    if (!isUuid(homeTeamId)) nextErrors.homeTeamId = 'Нужен GUID первой команды'
    if (!isUuid(awayTeamId)) nextErrors.awayTeamId = 'Нужен GUID второй команды'
    if (
      isUuid(homeTeamId) &&
      isUuid(awayTeamId) &&
      homeTeamId.trim().toLowerCase() === awayTeamId.trim().toLowerCase()
    ) {
      nextErrors.awayTeamId = 'Команды должны быть разными'
    }
    if (!scheduled) nextErrors.schedule = 'Дата — ГГГГ-ММ-ДД, время — ЧЧ:ММ'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !scheduled) return

    mutation.mutate({
      stageId: stageId.trim(),
      homeTeamId: homeTeamId.trim(),
      awayTeamId: awayTeamId.trim(),
      startTimeUtc: scheduled.toISOString(),
    })
  }

  const errorMessage = mutation.error instanceof Error ? mutation.error.message : null

  return (
    <Screen>
      <Card>
        <SectionTitle>Новый матч</SectionTitle>
        <MutedText>
          Матч создаётся на этапе турнира: регламент (периоды, доп. время, пенальти) сервер снимает
          с правил этапа в момент создания и дальше правка этапа на матч не влияет.
        </MutedText>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Field
          label="Этап турнира (GUID)"
          value={stageId}
          onChangeText={(value) => {
            setStageId(value)
            setErrors((prev) => ({ ...prev, stageId: undefined }))
          }}
          placeholder="9bb13469-82be-418d-b820-483ccd8965eb"
          error={errors.stageId}
          hint="Правила этапа должны существовать, иначе сервер ответит 404."
        />
        <Field
          label="Первая команда (GUID)"
          value={homeTeamId}
          onChangeText={(value) => {
            setHomeTeamId(value)
            setErrors((prev) => ({ ...prev, homeTeamId: undefined }))
          }}
          placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa6"
          error={errors.homeTeamId}
        />
        <Field
          label="Вторая команда (GUID)"
          value={awayTeamId}
          onChangeText={(value) => {
            setAwayTeamId(value)
            setErrors((prev) => ({ ...prev, awayTeamId: undefined }))
          }}
          placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa7"
          error={errors.awayTeamId}
        />
        <Field
          label="Дата начала"
          value={date}
          onChangeText={(value) => {
            setDate(value)
            setErrors((prev) => ({ ...prev, schedule: undefined }))
          }}
          placeholder="2026-05-10"
          hint="Местное время устройства, на сервер уходит UTC."
        />
        <Field
          label="Время начала"
          value={time}
          onChangeText={(value) => {
            setTime(value)
            setErrors((prev) => ({ ...prev, schedule: undefined }))
          }}
          placeholder="18:30"
          keyboardType="numbers-and-punctuation"
        />
        {errors.schedule ? <Text style={styles.error}>{errors.schedule}</Text> : null}
      </Card>

      <Button title="Создать матч" large loading={mutation.isPending} onPress={submit} />

      <MutedText>
        Команды пока задаются идентификаторами: модуль Teams пуст, имена команд сервер не знает.
      </MutedText>
    </Screen>
  )
}

const styles = StyleSheet.create({
  error: {
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.danger,
  },
})
