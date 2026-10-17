import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native'

import { useMatchActions, useMatchQuery } from '../../src/hooks/useMatch'
import { formatClock, formatDateTime, shortId } from '../../src/match/format'
import { canStartNextPeriod, periodLabel, statusLabels, statusTones } from '../../src/match/status'
import { useMatchClock } from '../../src/match/useMatchClock'
import { forgetMatch } from '../../src/storage/recentMatches'
import { colors, fontSize, radius, spacing } from '../../src/theme'
import { Badge } from '../../src/ui/Badge'
import { Button } from '../../src/ui/Button'
import { Card, MutedText, SectionTitle } from '../../src/ui/Card'
import { Screen } from '../../src/ui/Screen'

function clockHint(status: string): string {
  switch (status) {
    case 'InProgress':
      return 'Игровое время периода'
    case 'Pause':
      return 'Пауза — время остановлено'
    case 'Finished':
      return 'Матч завершён'
    case 'Cancelled':
      return 'Матч отменён'
    default:
      return 'Секундомер ещё не запущен'
  }
}

export default function MatchScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const id = params.id ?? ''
  const router = useRouter()

  const query = useMatchQuery(id)
  const match = query.data ?? query.cachedMatch

  const actions = useMatchActions(id, (error) => {
    Alert.alert('Не удалось изменить статус', error.message)
  })

  const clock = useMatchClock(match ?? undefined)

  const busy =
    actions.start.isPending ||
    actions.stop.isPending ||
    actions.resume.isPending ||
    actions.nextPeriod.isPending ||
    actions.finish.isPending

  if (!match) {
    return (
      <Screen>
        <Card>
          {query.isPending ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <MutedText>Загружаем матч…</MutedText>
            </View>
          ) : (
            <>
              <Text style={styles.error}>
                {query.error instanceof Error ? query.error.message : 'Матч не найден'}
              </Text>
              <Button title="Повторить" onPress={() => void query.refetch()} />
              <Button
                title="Подключиться по коду"
                variant="secondary"
                onPress={() => router.replace('/connect')}
              />
            </>
          )}
        </Card>
      </Screen>
    )
  }

  const confirmFinish = () =>
    Alert.alert('Завершить матч?', 'После завершения статус матча изменить нельзя.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Завершить', style: 'destructive', onPress: () => actions.finish.mutate() },
    ])

  const confirmNextPeriod = () =>
    Alert.alert(
      'Следующий период',
      `Матч перейдёт на период ${match.currentPeriod + 1} из ${match.periodsCount}.`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Продолжить', onPress: () => actions.nextPeriod.mutate() },
      ],
    )

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      {query.isError ? (
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>Нет связи с сервером</Text>
          <MutedText>
            Показаны последние известные данные. Смена статуса требует связи — повторите, когда сеть
            появится.
          </MutedText>
          <Button title="Обновить" variant="secondary" onPress={() => void query.refetch()} />
        </Card>
      ) : null}

      <Card>
        <View style={styles.rowBetween}>
          <Badge label={statusLabels[match.status]} tone={statusTones[match.status]} />
          <Text style={styles.period}>{periodLabel(match)}</Text>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.team}>
            <Text style={styles.teamTitle}>Хозяева</Text>
            <Text style={styles.teamId}>{shortId(match.homeTeamId)}</Text>
          </View>

          <Text style={styles.score}>
            {match.homeScore} : {match.awayScore}
          </Text>

          <View style={[styles.team, styles.teamRight]}>
            <Text style={styles.teamTitle}>Гости</Text>
            <Text style={styles.teamId}>{shortId(match.awayTeamId)}</Text>
          </View>
        </View>

        <View style={styles.clockBox}>
          <Text style={styles.clock}>
            {clock.elapsedMs === null ? '—' : formatClock(clock.elapsedMs)}
          </Text>
          <Text style={styles.clockHint}>{clockHint(match.status)}</Text>
        </View>

        {match.status === 'Scheduled' ? (
          <Button
            title="Начать матч"
            large
            loading={actions.start.isPending}
            disabled={busy}
            onPress={() => actions.start.mutate()}
          />
        ) : null}

        {match.status === 'InProgress' ? (
          <>
            <Button
              title="Пауза"
              variant="secondary"
              loading={actions.stop.isPending}
              disabled={busy}
              onPress={() => actions.stop.mutate()}
            />
            {canStartNextPeriod(match) ? (
              <Button
                title={`Начать период ${match.currentPeriod + 1}`}
                variant="secondary"
                loading={actions.nextPeriod.isPending}
                disabled={busy}
                onPress={confirmNextPeriod}
              />
            ) : null}
            <Button
              title="Завершить матч"
              variant="danger"
              loading={actions.finish.isPending}
              disabled={busy}
              onPress={confirmFinish}
            />
          </>
        ) : null}

        {match.status === 'Pause' ? (
          <>
            <Button
              title="Продолжить"
              loading={actions.resume.isPending}
              disabled={busy}
              onPress={() => actions.resume.mutate()}
            />
            {canStartNextPeriod(match) ? (
              <Button
                title={`Начать период ${match.currentPeriod + 1}`}
                variant="secondary"
                loading={actions.nextPeriod.isPending}
                disabled={busy}
                onPress={confirmNextPeriod}
              />
            ) : null}
            <MutedText>
              Завершить матч из паузы домен не разрешает: сначала продолжите матч.
            </MutedText>
          </>
        ) : null}

        {match.status === 'Finished' || match.status === 'Cancelled' ? (
          <MutedText>
            {match.status === 'Finished'
              ? 'Матч завершён. Статус изменить нельзя.'
              : 'Матч отменён.'}
          </MutedText>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>События</SectionTitle>
        <MutedText>
          Голы, карточки и замены появятся, когда в модуле Matches будет эндпоинт событий
          (MatchEvent с идемпотентностью по клиентскому UUID). Сейчас сервер не принимает события,
          поэтому счёт приходит только из матча и не меняется отсюда.
        </MutedText>
        <Button title="События — скоро" variant="secondary" disabled onPress={() => undefined} />
      </Card>

      <Card>
        <SectionTitle>Матч</SectionTitle>
        <DetailRow label="Начало" value={formatDateTime(match.scheduledTimeUtc)} />
        <DetailRow label="Стартовал" value={formatDateTime(match.startedAtUtc)} />
        <DetailRow label="Регламент" value={`${match.periodsCount} × ${match.periodDurationMinutes} мин`} />
        <DetailRow label="Доп. время" value={match.extraTimeEnabled ? 'Да' : 'Нет'} />
        <DetailRow label="Пенальти" value={match.penaltyShootoutEnabled ? 'Да' : 'Нет'} />
        <DetailRow label="Этап" value={match.stageId} mono />
        <DetailRow label="Код матча" value={match.id} mono />
      </Card>

      <Button
        title="Убрать из недавних"
        variant="ghost"
        onPress={() => {
          void forgetMatch(match.id).then(() => router.replace('/'))
        }}
      />
    </Screen>
  )
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={[styles.detailValue, mono && styles.mono]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: spacing(3),
    paddingVertical: spacing(6),
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
  },
  period: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textMuted,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
  },
  team: {
    flex: 1,
    gap: spacing(1),
  },
  teamRight: {
    alignItems: 'flex-end',
  },
  teamTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.text,
  },
  teamId: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  score: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  clockBox: {
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(2),
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  clock: {
    fontSize: fontSize.clock,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  clockHint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  warningCard: {
    borderColor: colors.warning,
    backgroundColor: colors.warningSurface,
  },
  warningTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.warning,
  },
  error: {
    fontSize: fontSize.body,
    lineHeight: 21,
    color: colors.danger,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing(3),
  },
  detailLabel: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    paddingTop: 2,
  },
  detailValue: {
    flexShrink: 1,
    fontSize: fontSize.body,
    color: colors.text,
    textAlign: 'right',
  },
  mono: {
    fontSize: fontSize.caption,
    fontFamily: 'monospace',
  },
})
