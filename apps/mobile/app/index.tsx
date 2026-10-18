import { Redirect, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useAuth } from '../src/auth/AuthProvider'
import { formatDateTime } from '../src/match/format'
import { statusLabels } from '../src/match/status'
import { useMyMatches } from '../src/hooks/useMyMatches'
import { useTeamNames } from '../src/hooks/useTeamNames'
import { loadRecentMatches, type RecentMatch } from '../src/storage/recentMatches'
import { MatchRow } from '../src/match/MatchRow'
import { colors, fontSize, radius, spacing } from '../src/theme'
import { Button } from '../src/ui/Button'
import { Card, MutedText, SectionTitle } from '../src/ui/Card'
import { Screen } from '../src/ui/Screen'

export default function HomeScreen() {
  const router = useRouter()
  const { status, user, logout } = useAuth()
  const [recent, setRecent] = useState<RecentMatch[]>([])

  const myMatches = useMyMatches()

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

      void myMatches.refetch()

      return () => {
        active = false
      }
    }, [myMatches.refetch]),
  )

  if (status === 'anonymous') return <Redirect href="/login" />

  return (
    <Screen>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.heading}>{user?.displayName ?? 'Судья'}</Text>
          <Button title="Выйти" variant="ghost" onPress={() => void logout()} />
        </View>
        <MutedText>{user?.tenantName ?? ''}</MutedText>
      </Card>

      <Card>
        <SectionTitle>Мои матчи</SectionTitle>

        {myMatches.isPending ? <MutedText>Загружаем назначения…</MutedText> : null}

        {myMatches.error ? (
          <MutedText>
            Не удалось получить назначения: {myMatches.error instanceof Error ? myMatches.error.message : 'ошибка'}
          </MutedText>
        ) : null}

        {myMatches.data?.length === 0 ? (
          <MutedText>
            Назначений пока нет. Организатор назначит вас на матч — он появится здесь автоматически.
          </MutedText>
        ) : null}

        {myMatches.data?.map((match) => (
          <Pressable
            key={match.id}
            style={styles.matchRow}
            onPress={() => router.push(`/match/${match.id}`)}
          >
            <View style={styles.matchTeams}>
              <Text style={styles.matchTeam}>{match.homeTeamName}</Text>
              <Text style={styles.matchTeam}>{match.awayTeamName}</Text>
            </View>

            <View style={styles.matchMeta}>
              <Text style={styles.matchStatus}>
                {statusLabels[match.status] ?? match.status}
                {match.status === 'InProgress' || match.status === 'Finished'
                  ? ` · ${match.homeScore}:${match.awayScore}`
                  : ''}
              </Text>
              <Text style={styles.matchTime}>{formatDateTime(match.scheduledTimeUtc)}</Text>
            </View>
          </Pressable>
        ))}

        {myMatches.data && myMatches.data.length > 0 ? (
          <Button
            title="Обновить назначения"
            variant="secondary"
            loading={myMatches.isRefetching}
            onPress={() => void myMatches.refetch()}
          />
        ) : null}
      </Card>

      <Card>
        <Text style={styles.heading}>Подключение</Text>
        <MutedText>
          Если матч уже открыт по ссылке или QR-коду — подключитесь к нему напрямую.
          Создание нового матча доступно, только если вы ведёте его первым.
        </MutedText>
        <Button title="Подключиться к матчу" large onPress={() => router.push('/connect')} />
        <Button title="Создать матч" variant="secondary" onPress={() => router.push('/create')} />
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2),
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted ?? colors.surface,
  },
  matchTeams: {
    flex: 1,
    gap: 2,
  },
  matchTeam: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.text,
  },
  matchMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  matchStatus: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.primary,
  },
  matchTime: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
})
