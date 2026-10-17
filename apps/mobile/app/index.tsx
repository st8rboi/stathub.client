import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, Text } from 'react-native'

import { formatDateTime } from '../src/match/format'
import { MatchRow } from '../src/match/MatchRow'
import { useTeamNames } from '../src/hooks/useTeamNames'
import { loadRecentMatches, type RecentMatch } from '../src/storage/recentMatches'
import { colors, fontSize, spacing } from '../src/theme'
import { Button } from '../src/ui/Button'
import { Card, MutedText, SectionTitle } from '../src/ui/Card'
import { Screen } from '../src/ui/Screen'

export default function HomeScreen() {
  const router = useRouter()
  const [recent, setRecent] = useState<RecentMatch[]>([])

  // Названия команд подтягиваются пачкой на все недавние матчи, а не по строке.
  const teamName = useTeamNames(
    recent.flatMap((item) => [item.match.homeTeamId, item.match.awayTeamId]),
  )

  // Кэш недавних матчей перечитывается при каждом возврате на экран:
  // после матча статус в списке уже обновлён.
  useFocusEffect(
    useCallback(() => {
      let active = true

      void loadRecentMatches().then((items) => {
        if (active) setRecent(items)
      })

      return () => {
        active = false
      }
    }, []),
  )

  return (
    <Screen>
      <Card>
        <Text style={styles.heading}>Матч</Text>
        <MutedText>
          Подключитесь к матчу по коду от организатора или создайте новый, если ведёте его первым.
        </MutedText>
        <Button title="Подключиться к матчу" large onPress={() => router.push('/connect')} />
        <Button title="Создать матч" variant="secondary" onPress={() => router.push('/create')} />
      </Card>

      <Card>
        <SectionTitle>Назначенные мне</SectionTitle>
        <MutedText>
          Пока пусто: назначение судьи на матч появится вместе с модулем Identity. Сейчас сервер не знает,
          кто вы и на какие матчи вас назначили, поэтому матч открывается по коду или из списка этапа.
        </MutedText>
      </Card>

      <Card>
        <SectionTitle>Недавние матчи</SectionTitle>
        {recent.length === 0 ? (
          <MutedText>Здесь появятся матчи, которые вы открывали на этом устройстве.</MutedText>
        ) : (
          recent.map((item) => (
            <MatchRow
              key={item.match.id}
              match={item.match}
              teamName={teamName}
              meta={`Открыт ${formatDateTime(item.savedAt)}`}
              onPress={() => router.push(`/match/${item.match.id}`)}
            />
          ))
        )}
      </Card>

      <Button title="Сервер" variant="ghost" onPress={() => router.push('/settings')} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  heading: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
})
