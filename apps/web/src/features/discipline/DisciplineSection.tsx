import { useState } from 'react'
import { formatDate } from '@/shared/lib/format'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Badge, Card, EmptyState, Loading } from '@/shared/ui/layout'
import { Modal } from '@/shared/ui/Modal'
import { useDisqualifications, useLiftDisqualification, type Disqualification } from './api'
import { IssueDisqualificationForm } from './IssueDisqualificationForm'

function statusBadge(item: Disqualification) {
  if (item.isActive) return <Badge tone="danger">Действует</Badge>
  return <Badge>{item.liftedAtUtc ? 'Снята' : 'Отбыта'}</Badge>
}

/**
 * Дисциплинарный учёт турнира: дисквалификация игрока в его команде на N матчей
 * (или бессрочно). Отбытое считается по завершённым матчам команды после выдачи.
 */
export function DisciplineSection({
  tournamentId,
  stages,
}: {
  tournamentId: string
  stages: { id: string; name: string }[]
}) {
  const list = useDisqualifications(tournamentId)
  const lift = useLiftDisqualification()
  const confirm = useConfirm()
  const [issuing, setIssuing] = useState(false)

  // Действующие сверху, внутри — свежие первыми.
  const items = [...(list.data ?? [])].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || b.issuedAtUtc.localeCompare(a.issuedAtUtc),
  )
  const activeCount = items.filter((item) => item.isActive).length

  const issueButton = (
    <button type="button" onClick={() => setIssuing(true)} disabled={stages.length === 0}>
      <Icon name="plus" size={18} />
      Дисквалифицировать
    </button>
  )

  return (
    <>
      <ErrorText error={list.error ?? lift.error} />
      {list.isPending && <Loading />}

      {list.data?.length === 0 && (
        <EmptyState icon="flag" title="Дисквалификаций нет" action={issueButton}>
          Пока дисквалификация действует, сервер отклонит гол, карточку или замену с участием игрока.
          {stages.length === 0 && ' Сначала добавьте в турнир этап с заявленными командами.'}
        </EmptyState>
      )}

      {items.length > 0 && (
        <Card
          title={activeCount > 0 ? `Дисквалификации · действуют: ${activeCount}` : 'Дисквалификации'}
          actions={issueButton}
          flush
        >
          <table>
            <thead>
              <tr>
                <th>Игрок</th>
                <th>Команда</th>
                <th>Причина</th>
                <th>Срок</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.playerName || item.playerId.slice(0, 8)}</strong>
                    <div className="hint">с {formatDate(item.issuedAtUtc)}</div>
                  </td>
                  <td>{item.teamName || item.teamId.slice(0, 8)}</td>
                  <td>{item.reason}</td>
                  <td className="num">
                    {item.matchesBanned === null
                      ? 'бессрочно'
                      : `${item.matchesServed} из ${item.matchesBanned} матч.`}
                  </td>
                  <td>{statusBadge(item)}</td>
                  <td className="actions-cell">
                    {item.isActive && (
                      <button
                        type="button"
                        className="secondary"
                        disabled={lift.isPending}
                        onClick={() =>
                          void confirm({
                            title: 'Снять дисквалификацию?',
                            message: `${item.playerName} снова сможет участвовать в матчах.`,
                            confirmLabel: 'Снять',
                          }).then((ok) => {
                            if (ok) lift.mutate({ id: item.id, comment: null })
                          })
                        }
                      >
                        Снять
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={issuing} onClose={() => setIssuing(false)} title="Дисквалифицировать игрока">
        <IssueDisqualificationForm
          tournamentId={tournamentId}
          stages={stages}
          onDone={() => setIssuing(false)}
        />
      </Modal>
    </>
  )
}
