import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import type { MatchEvent } from '../../src/api/types'
import { computeScore, eventTypeLabels, formatEventTime, mergeEvents } from '../../src/events/projection'
import { useMatchActions } from '../../src/hooks/useMatch'
import { useMatchEvents, useMatchStateQuery } from '../../src/hooks/useMatchEvents'
import { useMatchRosters, type RosterPlayer } from '../../src/hooks/useMatchRosters'
import { useStageBans } from '../../src/hooks/useStageBans'
import { useTeamNames } from '../../src/hooks/useTeamNames'
import { formatClock, formatDateTime, shortId } from '../../src/match/format'
import { canStartNextPeriod, periodLabel, statusLabels, statusTones } from '../../src/match/status'
import { useMatchClock } from '../../src/match/useMatchClock'
import { forgetMatch } from '../../src/storage/recentMatches'
import { colors, fontSize, radius, spacing } from '../../src/theme'
import { ActionSheet } from '../../src/ui/ActionSheet'
import { Badge } from '../../src/ui/Badge'
import { Button } from '../../src/ui/Button'
import { Card, MutedText, SectionTitle } from '../../src/ui/Card'
import { Screen } from '../../src/ui/Screen'

/** Диалоги на экране: Alert на web не работает, поэтому все подтверждения — нижним листом. */
type Sheet =
  | { kind: 'goal-team' }
  | { kind: 'goal-player'; teamId: string }
  | { kind: 'goal-assist'; teamId: string; scorerId: string }
  | { kind: 'card-team' }
  | { kind: 'card-player'; teamId: string }
  | { kind: 'card-type'; teamId: string; playerId?: string }
  | { kind: 'void'; event: MatchEvent }
  | { kind: 'finish' }
  | { kind: 'next-period' }

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

  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const stateQuery = useMatchStateQuery(id)
  const match = stateQuery.data?.match ?? stateQuery.cachedMatch

  const actions = useMatchActions(id, (error) => {
    setActionError(error.message)
  })

  const events = useMatchEvents(id, stateQuery.data)
  const clock = useMatchClock(match ?? undefined)
  const teamLabel = useTeamNames(match ? [match.homeTeamId, match.awayTeamId] : [])
  const rosters = useMatchRosters(match ?? undefined)
  // Дисквалификации этапа: все хуки — до раннего return, иначе меняется их число при загрузке матча.
  const stageBans = useStageBans(match?.stageId ?? '')

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
          {stateQuery.isPending ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <MutedText>Загружаем матч…</MutedText>
            </View>
          ) : (
            <>
              <Text style={styles.error}>
                {stateQuery.error instanceof Error ? stateQuery.error.message : 'Матч не найден'}
              </Text>
              <Button title="Повторить" onPress={() => void stateQuery.refetch()} />
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

  // Очередь показываем всегда (даже без связи), а счёт считаем из состояния сервера;
  // без него показываем последний известный счёт из кэша, чтобы не терять уже забитые голы.
  const mergedEvents = mergeEvents(stateQuery.data?.events ?? [], events.pending, id)
  const score = stateQuery.data
    ? computeScore(match, mergedEvents)
    : { home: match.homeScore, away: match.awayScore }
  const pendingIds = new Set(events.pending.map((event) => event.id))
  const eventsLocked = match.status === 'Finished' || match.status === 'Cancelled'

  const playerNameById = new Map(
    [...rosters.home, ...rosters.away].map((player) => [player.playerId, player.fullName]),
  )
  const playerName = (playerId: string) => playerNameById.get(playerId) ?? shortId(playerId)

  // Пометка дисквалифицированных: сервер отклонит событие, лучше предупредить заранее.
  const bannedPlayerIds = new Set((stageBans.data ?? []).map((ban) => ban.playerId))
  const playerLabel = (player: RosterPlayer) => {
    const base = player.squadNumber ? `№${player.squadNumber} ${player.fullName}` : player.fullName
    return bannedPlayerIds.has(player.playerId) ? `${base} · дисквалифицирован` : base
  }

  const rosterFor = (teamId: string): RosterPlayer[] =>
    teamId === match.homeTeamId ? rosters.home : rosters.away

  const describe = (event: MatchEvent): string => {
    if (event.type === 'EventVoided')
      return event.reason ? `Отмена: ${event.reason}` : 'Отмена события'

    const team =
      event.teamId === match.homeTeamId
        ? teamLabel(match.homeTeamId)
        : event.teamId === match.awayTeamId
          ? teamLabel(match.awayTeamId)
          : ''

    const player = event.playerId ? playerName(event.playerId) : ''
    const assist = event.relatedPlayerId ? `ассист: ${playerName(event.relatedPlayerId)}` : ''

    return [eventTypeLabels[event.type], team, player, assist].filter(Boolean).join(' · ')
  }

  const teamOptions = (onSelect: (teamId: string) => void) => [
    { label: teamLabel(match.homeTeamId), onPress: () => onSelect(match.homeTeamId) },
    { label: teamLabel(match.awayTeamId), onPress: () => onSelect(match.awayTeamId) },
  ]

  const sheetContent = (() => {
    switch (sheet?.kind) {
      case 'goal-team':
        return {
          title: 'Гол',
          message: 'Какая команда забила?',
          options: teamOptions((teamId) => setSheet({ kind: 'goal-player', teamId })),
        }

      case 'goal-player': {
        const { teamId } = sheet
        const roster = rosterFor(teamId)

        return {
          title: 'Кто забил?',
          message:
            roster.length > 0
              ? teamLabel(teamId)
              : rosters.isLoading
                ? 'Загружаем состав…'
                : 'Состав команды не найден — можно отметить гол без автора.',
          options: [
            ...roster.map((player) => ({
              label: playerLabel(player),
              onPress: () => {
                // Ассистент необязателен, поэтому сначала спрашиваем второго игрока,
                // но всегда даём выбор «без ассистента».
                setSheet({ kind: 'goal-assist', teamId, scorerId: player.playerId })
              },
            })),
            {
              label: 'Без автора',
              description: 'Гол в счёт команды, без привязки к игроку',
              onPress: () => {
                setSheet(null)
                void events.enqueue({ type: 'Goal', teamId })
              },
            },
          ],
        }
      }

      case 'goal-assist': {
        const { teamId, scorerId } = sheet
        const roster = rosterFor(teamId).filter((player) => player.playerId !== scorerId)

        return {
          title: 'Ассистент',
          message:
            roster.length > 0
              ? `Кто отдал передачу? ${playerName(scorerId)}`
              : 'Состав не найден — ассистента можно не указывать.',
          options: [
            ...roster.map((player) => ({
              label: playerLabel(player),
              onPress: () => {
                setSheet(null)
                void events.enqueue({
                  type: 'Goal',
                  teamId,
                  playerId: scorerId,
                  relatedPlayerId: player.playerId,
                })
              },
            })),
            {
              label: 'Без ассистента',
              onPress: () => {
                setSheet(null)
                void events.enqueue({ type: 'Goal', teamId, playerId: scorerId })
              },
            },
          ],
        }
      }

      case 'card-team':
        return {
          title: 'Карточка',
          message: 'Кому показываем карточку?',
          options: teamOptions((teamId) => setSheet({ kind: 'card-player', teamId })),
        }

      case 'card-player': {
        const { teamId } = sheet
        const roster = rosterFor(teamId)

        return {
          title: 'Кому карточка?',
          message:
            roster.length > 0
              ? teamLabel(teamId)
              : rosters.isLoading
                ? 'Загружаем состав…'
                : 'Состав команды не найден — карточка уйдёт команде.',
          options: [
            ...roster.map((player) => ({
              label: playerLabel(player),
              onPress: () => setSheet({ kind: 'card-type', teamId, playerId: player.playerId }),
            })),
            {
              label: 'Без автора',
              description: 'Карточка в зачёт команды, без привязки к игроку',
              onPress: () => setSheet({ kind: 'card-type', teamId }),
            },
          ],
        }
      }

      case 'card-type': {
        const { teamId, playerId } = sheet

        return {
          title: 'Карточка',
          message: `Какая карточка? ${teamLabel(teamId)}`,
          options: [
            {
              label: 'Жёлтая',
              onPress: () => {
                setSheet(null)
                void events.enqueue({ type: 'YellowCard', teamId, playerId })
              },
            },
            {
              label: 'Красная',
              onPress: () => {
                setSheet(null)
                void events.enqueue({ type: 'RedCard', teamId, playerId })
              },
            },
          ],
        }
      }

      case 'void': {
        const { event } = sheet

        return {
          title: 'Отменить событие?',
          message: `${describe(event)} — останется в протоколе зачёркнутым.`,
          options: [
            {
              label: 'Отменить событие',
              destructive: true,
              onPress: () => {
                setSheet(null)
                void events.enqueue({
                  type: 'EventVoided',
                  targetEventId: event.id,
                  reason: 'отменено судьёй',
                })
              },
            },
          ],
        }
      }

      case 'finish':
        return {
          title: 'Завершить матч?',
          message: 'После завершения статус и протокол изменить нельзя.',
          options: [
            {
              label: 'Завершить матч',
              destructive: true,
              onPress: () => {
                setSheet(null)
                actions.finish.mutate()
              },
            },
          ],
        }

      case 'next-period':
        return {
          title: 'Следующий период',
          message: `Матч перейдёт на период ${match.currentPeriod + 1} из ${match.periodsCount}.`,
          options: [
            {
              label: 'Продолжить',
              onPress: () => {
                setSheet(null)
                actions.nextPeriod.mutate()
              },
            },
          ],
        }

      default:
        return null
    }
  })()

  const syncStatus = events.lastError
    ? `Нет связи: ${events.lastError} В очереди: ${events.pending.length}.`
    : events.pending.length > 0
      ? events.isSending
        ? 'Отправляем события на сервер…'
        : `В очереди: ${events.pending.length}`
      : 'Все события отправлены.'

  return (
    <>
      <Screen onRefresh={() => void stateQuery.refetch()} refreshing={stateQuery.isRefetching}>
        {stateQuery.isError ? (
          <Card style={styles.warningCard}>
            <Text style={styles.warningTitle}>Нет связи с сервером</Text>
            <MutedText>
              Показаны последние известные данные. Отмеченные события сохраняются на устройстве
              и уйдут на сервер, когда связь появится.
            </MutedText>
            <Button title="Обновить" variant="secondary" onPress={() => void stateQuery.refetch()} />
          </Card>
        ) : null}

        {actionError ? (
          <Card style={styles.warningCard}>
            <Text style={styles.warningTitle}>Действие не выполнено</Text>
            <MutedText>{actionError}</MutedText>
            <Button title="Скрыть" variant="secondary" onPress={() => setActionError(null)} />
          </Card>
        ) : null}

        <Card>
          <View style={styles.rowBetween}>
            <Badge label={statusLabels[match.status]} tone={statusTones[match.status]} />
            <Text style={styles.period}>{periodLabel(match)}</Text>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.teamTitle} numberOfLines={2}>
              {teamLabel(match.homeTeamId)}
            </Text>

            <Text style={styles.score}>
              {score.home} : {score.away}
            </Text>

            <Text style={[styles.teamTitle, styles.teamRight]} numberOfLines={2}>
              {teamLabel(match.awayTeamId)}
            </Text>
          </View>

          <View style={styles.clockBox}>
            <Text style={styles.clock}>
              {clock.elapsedMs === null ? '—' : formatClock(clock.elapsedMs)}
            </Text>
            <Text style={styles.clockHint}>{clockHint(match.status)}</Text>
          </View>

          {/* Управление матчем — в один ряд, чтобы не занимать пол-экрана. */}
          <View style={styles.controlsRow}>
            {match.status === 'Scheduled' ? (
              <Button
                title="Начать матч"
                compact
                style={styles.controlButton}
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
                  compact
                  style={styles.controlButton}
                  loading={actions.stop.isPending}
                  disabled={busy}
                  onPress={() => actions.stop.mutate()}
                />
                {canStartNextPeriod(match) ? (
                  <Button
                    title={`Период ${match.currentPeriod + 1}`}
                    variant="secondary"
                    compact
                    style={styles.controlButton}
                    loading={actions.nextPeriod.isPending}
                    disabled={busy}
                    onPress={() => setSheet({ kind: 'next-period' })}
                  />
                ) : null}
                <Button
                  title="Завершить"
                  variant="danger"
                  compact
                  style={styles.controlButton}
                  loading={actions.finish.isPending}
                  disabled={busy}
                  onPress={() => setSheet({ kind: 'finish' })}
                />
              </>
            ) : null}

            {match.status === 'Pause' ? (
              <>
                <Button
                  title="Продолжить"
                  compact
                  style={styles.controlButton}
                  loading={actions.resume.isPending}
                  disabled={busy}
                  onPress={() => actions.resume.mutate()}
                />
                {canStartNextPeriod(match) ? (
                  <Button
                    title={`Период ${match.currentPeriod + 1}`}
                    variant="secondary"
                    compact
                    style={styles.controlButton}
                    loading={actions.nextPeriod.isPending}
                    disabled={busy}
                    onPress={() => setSheet({ kind: 'next-period' })}
                  />
                ) : null}
              </>
            ) : null}
          </View>

          {match.status === 'Pause' ? (
            <MutedText>
              Завершить матч из паузы домен не разрешает: сначала продолжите матч.
            </MutedText>
          ) : null}

          {eventsLocked ? (
            <MutedText>Матч завершён — протокол закрыт, события и статус изменить нельзя.</MutedText>
          ) : null}
        </Card>

        <Card>
          <SectionTitle>События</SectionTitle>

          <View style={styles.actionRow}>
            <Button
              title="Гол"
              compact
              style={styles.actionButton}
              disabled={eventsLocked}
              onPress={() => setSheet({ kind: 'goal-team' })}
            />
            <Button
              title="Карточка"
              variant="secondary"
              compact
              style={styles.actionButton}
              disabled={eventsLocked}
              onPress={() => setSheet({ kind: 'card-team' })}
            />
          </View>

          <Text style={[styles.syncStatus, events.lastError ? styles.syncError : null]}>
            {syncStatus}
          </Text>
        </Card>

        <Card>
          <SectionTitle>Протокол</SectionTitle>
          {mergedEvents.length === 0 ? (
            <MutedText>Событий пока нет. Гол и карточка отмечаются кнопками выше.</MutedText>
          ) : (
            mergedEvents.map((event) => (
              <View key={event.id} style={styles.eventRow}>
                <View style={styles.eventText}>
                  <Text style={[styles.eventTitle, event.isVoided && styles.eventVoided]}>
                    {describe(event)}
                    {pendingIds.has(event.id) ? ' · в очереди' : ''}
                  </Text>
                  <Text style={styles.eventMeta}>{formatEventTime(event.clientTimestampUtc)}</Text>
                </View>

                {!event.isVoided && event.type !== 'EventVoided' && !eventsLocked ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSheet({ kind: 'void', event })}
                    style={({ pressed }) => [styles.voidButton, pressed && styles.voidButtonPressed]}
                  >
                    <Text style={styles.voidButtonLabel}>Отменить</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </Card>

        <Card>
          <SectionTitle>Матч</SectionTitle>
          <DetailRow label="Начало" value={formatDateTime(match.scheduledTimeUtc)} />
          <DetailRow label="Стартовал" value={formatDateTime(match.startedAtUtc)} />
          <DetailRow
            label="Регламент"
            value={`${match.periodsCount} × ${match.periodDurationMinutes} мин`}
          />
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

      {sheetContent ? (
        <ActionSheet
          title={sheetContent.title}
          message={sheetContent.message}
          options={sheetContent.options}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </>
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
  teamTitle: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.text,
  },
  teamRight: {
    textAlign: 'right',
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
  controlsRow: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  controlButton: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  actionButton: {
    flex: 1,
  },
  syncStatus: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  syncError: {
    color: colors.warning,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
    paddingVertical: spacing(1),
  },
  eventText: {
    flexShrink: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: fontSize.body,
    color: colors.text,
  },
  eventVoided: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  eventMeta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  voidButton: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSurface,
  },
  voidButtonPressed: {
    opacity: 0.7,
  },
  voidButtonLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.danger,
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
