import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { usePlayersByIds } from '@/features/players/hooks'
import { useTeamsByIds } from '@/features/teams/hooks'
import { formatDate, plural } from '@/shared/lib/format'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Badge, Card, EmptyState, Loading, LogoBadge, PageHeader, PersonAvatar, type BadgeTone } from '@/shared/ui/layout'
import { Menu, MenuButton } from '@/shared/ui/Menu'
import { Modal } from '@/shared/ui/Modal'
import { RegisterPlayerForm } from '../components/RegisterPlayerForm'
import { TransferPlayerForm } from '../components/TransferPlayerForm'
import {
  useDeleteRegistration,
  useDeleteTournamentTeam,
  useReleasePlayer,
  useTournamentTeam,
  useTournamentTeams,
  useWithdrawTournamentTeam,
} from '../hooks'
import { registrationStatusLabels, tournamentTeamStatusLabels } from '../labels'
import type { PlayerRegistration, PlayerRegistrationStatus } from '../types'

const registrationTones: Record<PlayerRegistrationStatus, BadgeTone> = {
  Active: 'success',
  TransferredOut: 'info',
  Released: 'neutral',
}

/** Активные сверху в порядке заявки, потом история — свежие первыми. */
function byRosterOrder(a: PlayerRegistration, b: PlayerRegistration): number {
  const aActive = a.status === 'Active'
  const bActive = b.status === 'Active'
  if (aActive !== bActive) return aActive ? -1 : 1
  if (aActive) return a.joinedOn.localeCompare(b.joinedOn)
  return (b.leftOn ?? '').localeCompare(a.leftOn ?? '')
}

/**
 * Состав команды на этапе: заявка игрока, отзаявка и трансфер.
 * История заявок не скрывается — закрытые строки доступны в фильтре «С историей».
 */
export default function TournamentTeamPage() {
  const confirm = useConfirm()
  const navigate = useNavigate()
  const { leagueId = '', tournamentId = '', stageId = '', tournamentTeamId = '' } = useParams()

  const details = useTournamentTeam(stageId, tournamentTeamId)
  const tournamentTeams = useTournamentTeams(stageId)
  const allTeams = useTeamsByIds([
    ...(tournamentTeams.data ?? []).map((item) => item.teamId),
    ...(details.data ? [details.data.teamId] : []),
  ])

  const registrations = details.data?.registrations ?? []
  const playersByIds = usePlayersByIds([...new Set(registrations.map((registration) => registration.playerId))])

  const release = useReleasePlayer(stageId, tournamentTeamId)
  const withdraw = useWithdrawTournamentTeam(stageId, tournamentTeamId)
  const deleteRegistration = useDeleteRegistration(stageId, tournamentTeamId)
  const deleteTeam = useDeleteTournamentTeam(stageId, tournamentTeamId)

  const [showHistory, setShowHistory] = useState(false)
  const [registering, setRegistering] = useState(false)
  // null — окно закрыто; '' — открыто без выбранного игрока.
  const [transferPlayerId, setTransferPlayerId] = useState<string | null>(null)

  const teamById = (id: string) => allTeams.data?.find((team) => team.id === id)
  const teamName = (id: string) => teamById(id)?.name ?? '…'
  const playerById = (id: string) => playersByIds.data?.find((player) => player.id === id)
  const playerName = (id: string) => playerById(id)?.fullName ?? '…'

  if (details.error) return <ErrorText error={details.error} />
  if (!details.data) return <Loading />

  const { data } = details
  const isActiveTeam = data.status === 'Active'
  const active = registrations.filter((registration) => registration.status === 'Active')
  const historyCount = registrations.length - active.length
  const visible = (showHistory ? registrations : active).slice().sort(byRosterOrder)

  const otherTeams = (tournamentTeams.data ?? [])
    .filter((item) => item.id !== tournamentTeamId && item.status === 'Active')
    .map((item) => ({ id: item.teamId, name: teamName(item.teamId) }))
  const canTransfer = isActiveTeam && active.length > 0 && otherTeams.length > 0

  const name = teamName(data.teamId)
  const team = teamById(data.teamId)

  const askWithdraw = () =>
    void confirm({
      title: 'Снять команду с турнира?',
      message: 'Все активные заявки игроков закроются. История матчей сохранится.',
      confirmLabel: 'Снять команду',
      danger: true,
    }).then((ok) => {
      if (ok) withdraw.mutate()
    })

  const askDeleteTeam = () =>
    void confirm({
      title: 'Удалить заявку команды?',
      message:
        'Только для ошибочно заявленной команды без матчей на этапе: заявка удалится вместе с составом. Это действие нельзя отменить.',
      confirmLabel: 'Удалить заявку',
      danger: true,
    }).then((ok) => {
      // Сервер откажет (409), если у команды уже есть матчи на этапе — тогда её снимают.
      if (ok)
        deleteTeam.mutate(undefined, {
          onSuccess: () => void navigate(`/leagues/${leagueId}/tournaments/${tournamentId}/stages/${stageId}/teams`),
        })
    })

  const askRelease = (registration: PlayerRegistration) =>
    void confirm({
      title: `Отзаявить игрока ${playerName(registration.playerId)}?`,
      message: 'Заявка закроется и останется в истории.',
      confirmLabel: 'Отзаявить',
    }).then((ok) => {
      if (ok) release.mutate(registration.id)
    })

  const askDeleteRegistration = (registration: PlayerRegistration) =>
    void confirm({
      title: 'Удалить ошибочную заявку?',
      message: `${playerName(registration.playerId)}: заявка удалится без следа в истории. Только если у игрока нет событий в матчах за команду.`,
      confirmLabel: 'Удалить',
      danger: true,
    }).then((ok) => {
      // Сервер откажет (409), если у игрока уже есть события в матчах за команду.
      if (ok) deleteRegistration.mutate(registration.id)
    })

  const registerButton = isActiveTeam && (
    <button type="button" onClick={() => setRegistering(true)}>
      <Icon name="plus" size={18} />
      Заявить игрока
    </button>
  )

  return (
    <>
      <PageHeader
        media={<LogoBadge src={team?.logoUrl ?? null} name={name} size="lg" />}
        eyebrow="Состав на этапе"
        title={name}
        meta={
          <>
            {!isActiveTeam && <Badge tone="danger">{tournamentTeamStatusLabels[data.status]}</Badge>}
            <span>{plural(active.length, ['игрок заявлен', 'игрока заявлено', 'игроков заявлено'])}</span>
          </>
        }
        actions={
          <>
            {registerButton}
            {canTransfer && (
              <button type="button" className="secondary" onClick={() => setTransferPlayerId('')}>
                Трансфер
              </button>
            )}
            <Menu triggerClassName="icon-button" triggerLabel="Действия с командой" trigger={<Icon name="more" />} align="end">
              {isActiveTeam && (
                <MenuButton danger disabled={withdraw.isPending} onClick={askWithdraw}>
                  Снять с турнира
                </MenuButton>
              )}
              <MenuButton danger disabled={deleteTeam.isPending} onClick={askDeleteTeam}>
                Удалить ошибочную заявку
              </MenuButton>
            </Menu>
          </>
        }
      />
      <ErrorText error={withdraw.error ?? deleteTeam.error} />
      {!isActiveTeam && <p className="notice">Команда снята с турнира — новые заявки и трансферы недоступны.</p>}

      {registrations.length === 0 ? (
        <EmptyState icon="user" title="Состав пуст" action={registerButton || undefined}>
          Заявите игроков из справочника — без заявки игрок не сможет участвовать в матчах этапа.
        </EmptyState>
      ) : (
        <>
          {historyCount > 0 && (
            <div className="toolbar">
              <div className="chips" role="group" aria-label="Какие заявки показать">
                <button type="button" className="chip" aria-pressed={!showHistory} onClick={() => setShowHistory(false)}>
                  В составе <span className="chip-count">{active.length}</span>
                </button>
                <button type="button" className="chip" aria-pressed={showHistory} onClick={() => setShowHistory(true)}>
                  С историей <span className="chip-count">{registrations.length}</span>
                </button>
              </div>
            </div>
          )}

          <Card flush>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Игрок</th>
                  {showHistory && <th>Статус</th>}
                  <th className="col-secondary">Заявлен</th>
                  {showHistory && <th className="col-secondary">Закрыта</th>}
                  <th>
                    <span className="visually-hidden">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((registration) => {
                  const isActive = registration.status === 'Active'
                  return (
                    <tr key={registration.id} className={isActive ? undefined : 'row-muted'}>
                      <td>
                        <div className="cell-main">
                          <PersonAvatar
                            src={playerById(registration.playerId)?.photoUrl ?? null}
                            name={playerName(registration.playerId)}
                          />
                          <strong>{playerName(registration.playerId)}</strong>
                        </div>
                      </td>
                      {showHistory && (
                        <td>
                          <Badge tone={registrationTones[registration.status]}>
                            {registrationStatusLabels[registration.status]}
                          </Badge>
                        </td>
                      )}
                      <td className="col-secondary muted">{formatDate(registration.joinedOn)}</td>
                      {showHistory && (
                        <td className="col-secondary muted">
                          {registration.leftOn ? formatDate(registration.leftOn) : '—'}
                        </td>
                      )}
                      <td>
                        <Menu
                          triggerClassName="icon-button"
                          triggerLabel={`Действия с заявкой: ${playerName(registration.playerId)}`}
                          trigger={<Icon name="more" />}
                          align="end"
                        >
                          {isActive && (
                            <>
                              {canTransfer && (
                                <MenuButton onClick={() => setTransferPlayerId(registration.playerId)}>
                                  Перевести в другую команду
                                </MenuButton>
                              )}
                              <MenuButton disabled={release.isPending} onClick={() => askRelease(registration)}>
                                Отзаявить
                              </MenuButton>
                            </>
                          )}
                          <MenuButton
                            danger
                            disabled={deleteRegistration.isPending}
                            onClick={() => askDeleteRegistration(registration)}
                          >
                            Удалить ошибочную заявку
                          </MenuButton>
                        </Menu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
          <ErrorText error={release.error ?? deleteRegistration.error} />
          <p className="list-footnote">
            Уход игрока оформляйте отзаявкой или трансфером — заявка останется в истории. Удаление — только для
            ошибочной заявки.
          </p>
        </>
      )}

      <Modal open={registering} onClose={() => setRegistering(false)} title={`Заявить игрока · ${name}`}>
        <RegisterPlayerForm
          stageId={stageId}
          tournamentTeamId={tournamentTeamId}
          activePlayerIds={new Set(active.map((registration) => registration.playerId))}
          onDone={() => setRegistering(false)}
        />
      </Modal>

      <Modal open={transferPlayerId !== null} onClose={() => setTransferPlayerId(null)} title="Трансфер игрока">
        <TransferPlayerForm
          stageId={stageId}
          fromTeamId={data.teamId}
          players={active.map((registration) => ({
            id: registration.playerId,
            label: playerName(registration.playerId),
          }))}
          teams={otherTeams}
          initialPlayerId={transferPlayerId ?? ''}
          onDone={() => setTransferPlayerId(null)}
        />
      </Modal>
    </>
  )
}
