import { useState } from 'react'
import { plural } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { EmptyState, Loading, PageHeader } from '@/shared/ui/layout'
import { Modal } from '@/shared/ui/Modal'
import { AccountsTable } from '../components/AccountsTable'
import { CreateAccountForm } from '../components/CreateAccountForm'
import { useAccounts, useAssignments } from '../hooks'

/**
 * Статистики организации: считают удары, фолы и угловые на назначенных матчах.
 * Назначение на матч — в списке матчей этапа, рядом с судьёй.
 */
export default function StatisticiansPage() {
  const users = useAccounts()
  const assignments = useAssignments()
  const [creating, setCreating] = useState(false)

  const statisticians = (users.data ?? []).filter((user) => user.role === 'Statistician')

  // Сколько матчей назначено каждому статистику.
  const matchCounts = new Map<string, number>()
  for (const assignment of assignments.data ?? []) {
    if (assignment.scopeType === 'Match' && assignment.role === 'Statistician') {
      matchCounts.set(assignment.userId, (matchCounts.get(assignment.userId) ?? 0) + 1)
    }
  }

  const createButton = (
    <button type="button" onClick={() => setCreating(true)}>
      <Icon name="plus" size={18} />
      Новый статистик
    </button>
  )

  return (
    <>
      <PageHeader
        title="Статистики"
        meta={
          users.data &&
          statisticians.length > 0 && (
            <span>{plural(statisticians.length, ['статистик', 'статистика', 'статистиков'])}</span>
          )
        }
        actions={createButton}
      />
      <p className="hint page-intro">
        Статистик входит в админку по своему логину и видит только назначенные ему матчи. Он отмечает удары, удары в
        створ, фолы и угловые, но не управляет матчем. Назначить статистика можно в списке матчей этапа.
      </p>

      <ErrorText error={users.error ?? assignments.error} />
      {users.isPending && <Loading />}

      {users.data && statisticians.length === 0 && (
        <EmptyState icon="chart" title="Статистиков пока нет" action={createButton}>
          Создайте аккаунт статистика — после этого его можно назначать на матчи.
        </EmptyState>
      )}

      {statisticians.length > 0 && (
        <AccountsTable
          users={statisticians}
          extraColumn={{
            title: 'Назначения',
            render: (user) => {
              const count = matchCounts.get(user.id) ?? 0
              return count > 0 ? plural(count, ['матч', 'матча', 'матчей']) : <span className="muted">нет</span>
            },
          }}
        />
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый статистик">
        <CreateAccountForm roles={['Statistician']} onDone={() => setCreating(false)} />
      </Modal>
    </>
  )
}
