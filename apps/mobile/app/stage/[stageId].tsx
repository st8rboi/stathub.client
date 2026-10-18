import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text } from 'react-native'

import { useStageMatchesQuery } from '../../src/hooks/useMatch'
import { useTeamNames } from '../../src/hooks/useTeamNames'
import { MatchRow } from '../../src/match/MatchRow'
import { colors, fontSize } from '../../src/theme'
import { Button } from '../../src/ui/Button'
import { Card, MutedText } from '../../src/ui/Card'
import { Screen } from '../../src/ui/Screen'

export default function StageMatchesScreen() {
  const params = useLocalSearchParams<{ stageId: string }>()
  const stageId = params.stageId ?? ''
  const router = useRouter()
  const query = useStageMatchesQuery(stageId)

  // Названия команд для всего списка сразу: матч хранит только идентификаторы.
  const teamName = useTeamNames(
    (query.data ?? []).flatMap((match) => [match.homeTeamId, match.awayTeamId]),
  )

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      {query.isPending ? <ActivityIndicator color={colors.primary} /> : null}

      {query.isError ? (
        <Card>
          <Text style={styles.error}>
            {query.error instanceof Error ? query.error.message : 'Не удалось загрузить матчи этапа'}
          </Text>
          <Button title="Повторить" onPress={() => void query.refetch()} />
        </Card>
      ) : null}

      {query.data?.length === 0 ? (
        <Card>
          <MutedText>На этом этапе матчей ещё нет. Их создаёт организатор или вы через «Создать матч».</MutedText>
        </Card>
      ) : null}

      {query.data?.map((match) => (
        <MatchRow
          key={match.id}
          match={match}
          teamName={teamName}
          onPress={() => router.push(`/match/${match.id}`)}
        />
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  error: {
    fontSize: fontSize.body,
    lineHeight: 21,
    color: colors.danger,
  },
})
