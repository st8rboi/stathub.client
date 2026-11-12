import { useState, type SubmitEvent } from 'react'
import { useTournamentTeams } from '@/features/rosters/hooks'
import { useTeamsByIds } from '@/features/teams/hooks'
import { plural } from '@/shared/lib/format'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Card, LogoBadge } from '@/shared/ui/layout'
import { Menu, MenuButton } from '@/shared/ui/Menu'
import { Modal } from '@/shared/ui/Modal'
import { useDeleteStageGroup, useSaveStageGroup } from '../hooks'
import type { Stage, StageGroup, Tournament } from '../types'

/** Окно группы: новая (id нет) или правка существующей. */
type GroupDialog = { id?: string; name: string; teamIds: string[] }

/**
 * Группы кругового этапа. Без групп этап — одна общая таблица. С группами у каждой своя таблица,
 * матчи играются внутри группы, а «выходят дальше» считается от каждой группы.
 */
export function StageGroupsCard({ tournament, stage }: { tournament: Tournament; stage: Stage }) {
  const confirm = useConfirm()
  // Команды группы выбираются из заявленных в дивизион этапа.
  const divisionTeams = useTournamentTeams(stage.id)
  const teams = useTeamsByIds((divisionTeams.data ?? []).map((team) => team.teamId))
  const save = useSaveStageGroup(tournament.leagueId, tournament.id, stage.id)
  const remove = useDeleteStageGroup(tournament.leagueId, tournament.id, stage.id)

  const [dialog, setDialog] = useState<GroupDialog | null>(null)

  const teamById = (teamId: string) => teams.data?.find((team) => team.id === teamId)
  const teamName = (teamId: string) => teamById(teamId)?.name ?? '…'
  const byName = (a: string, b: string) => teamName(a).localeCompare(teamName(b), 'ru')

  const grouped = new Set(stage.groups.flatMap((group) => group.teamIds))
  const withoutGroup = (divisionTeams.data ?? [])
    .filter((team) => team.status === 'Active' && !grouped.has(team.teamId))
    .map((team) => team.teamId)

  const open = (next: GroupDialog) => {
    save.reset()
    setDialog(next)
  }

  const askRemove = (group: StageGroup) =>
    void confirm({
      title: `Удалить группу «${group.name}»?`,
      message: 'Команды останутся в дивизионе. Если в этапе уже есть матчи, группу удалить не получится.',
      confirmLabel: 'Удалить',
      danger: true,
    }).then((ok) => {
      if (ok) remove.mutate(group.id)
    })

  const toggleTeam = (teamId: string) =>
    setDialog((current) =>
      current && {
        ...current,
        teamIds: current.teamIds.includes(teamId)
          ? current.teamIds.filter((id) => id !== teamId)
          : [...current.teamIds, teamId],
      },
    )

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!dialog) return
    const name = String(new FormData(event.currentTarget).get('name')).trim()
    save.mutate(
      { groupId: dialog.id, body: { name, teamIds: dialog.teamIds } },
      { onSuccess: () => setDialog(null) },
    )
  }

  // В окне группы — её команды и свободные; занятые другими группами не предлагаем.
  const inOtherGroups = new Set(
    stage.groups.filter((group) => group.id !== dialog?.id).flatMap((group) => group.teamIds),
  )
  const selectable = [
    ...new Set([
      ...(dialog?.teamIds ?? []),
      ...(divisionTeams.data ?? []).filter((team) => team.status === 'Active').map((team) => team.teamId),
    ]),
  ]
    .filter((teamId) => !inOtherGroups.has(teamId))
    .sort(byName)

  return (
    <>
      <Card
        title="Группы"
        actions={
          <button type="button" className="secondary" onClick={() => open({ name: '', teamIds: [] })}>
            <Icon name="plus" size={18} />
            Добавить группу
          </button>
        }
      >
        {stage.groups.length === 0 ? (
          <p className="muted">
            Групп нет — у этапа одна общая таблица. Добавьте группы, если команды сначала играют в подгруппах: у каждой
            будет своя таблица, а матчи пройдут только внутри группы.
          </p>
        ) : (
          <>
            <div>
              {stage.groups.map((group) => (
                <div key={group.id} className="danger-row">
                  <div className="danger-row-text">
                    <p className="danger-row-title">
                      {group.name}{' '}
                      <span className="muted">· {plural(group.teamIds.length, ['команда', 'команды', 'команд'])}</span>
                    </p>
                    <p className="hint">
                      {group.teamIds.length > 0
                        ? [...group.teamIds].sort(byName).map(teamName).join(', ')
                        : 'Команды не выбраны'}
                    </p>
                  </div>
                  <Menu
                    triggerClassName="icon-button"
                    triggerLabel={`Действия с группой «${group.name}»`}
                    trigger={<Icon name="more" />}
                    align="end"
                  >
                    <MenuButton onClick={() => open({ id: group.id, name: group.name, teamIds: group.teamIds })}>
                      Изменить
                    </MenuButton>
                    <MenuButton danger disabled={remove.isPending} onClick={() => askRemove(group)}>
                      Удалить
                    </MenuButton>
                  </Menu>
                </div>
              ))}
            </div>
            {withoutGroup.length > 0 && (
              <p className="notice">
                Без группы: {withoutGroup.sort(byName).map(teamName).join(', ')}. Матч с такой командой создать не
                получится, и в таблицах её не будет.
              </p>
            )}
          </>
        )}
        <p className="hint">
          После первых матчей этапа состав групп можно только дополнять: убрать команду или удалить группу уже нельзя.
        </p>
        <ErrorText error={remove.error ?? divisionTeams.error} />
      </Card>

      <Modal open={dialog !== null} onClose={() => setDialog(null)} title={dialog?.id ? 'Группа' : 'Новая группа'}>
        {dialog && (
          <form onSubmit={submit}>
            <label>
              Название
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={dialog.name}
                placeholder="Например, Группа A"
                autoFocus
              />
            </label>
            {selectable.length === 0 ? (
              <p className="notice">
                Свободных команд нет: заявите команды на вкладке «Участники» или освободите их из других групп.
              </p>
            ) : (
              <ul className="check-list">
                {selectable.map((teamId) => (
                  <li key={teamId}>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={dialog.teamIds.includes(teamId)}
                        onChange={() => toggleTeam(teamId)}
                      />
                      <LogoBadge src={teamById(teamId)?.logoUrl ?? null} name={teamName(teamId)} size="sm" />
                      <span>{teamName(teamId)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="hint">Команда может быть только в одной группе этапа.</p>
            <ErrorText error={save.error} />
            <div className="actions">
              <button type="submit" disabled={save.isPending}>
                {dialog.id ? 'Сохранить' : 'Добавить группу'}
              </button>
              <button type="button" className="secondary" onClick={() => setDialog(null)}>
                Отмена
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
