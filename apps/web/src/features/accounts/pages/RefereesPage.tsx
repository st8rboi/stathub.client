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
 * Судьи организации: аккаунты для мобильного приложения судьи.
 * Назначение на матч — в списке матчей этапа.
 */
export default function RefereesPage() {
  const users = useAccounts()
  const assignments = useAssignments()
  const [creating, setCreating] = useState(false)

  const referees = (users.data ?? []).filter((user) => user.role === 'Referee')

  // Сколько матчей назначено каждому судье.
  const matchCounts = new Map<string, number>()
  for (const assignment of assignments.data ?? []) {
    if (assignment.scopeType === 'Match') {
      matchCounts.set(assignment.userId, (matchCounts.get(assignment.userId) ?? 0) + 1)
    }
  }

  const createButton = (
    <button type="button" onClick={() => setCreating(true)}>
      <Icon name="plus" size={18} />
      Новый судья
    </button>
  )

  return (
    <>
      <PageHeader
        title="Судьи"
        meta={users.data && referees.length > 0 && <span>{plural(referees.length, ['судья', 'судьи', 'судей'])}</span>}
        actions={createButton}
      />
      <p className="hint page-intro">
        Судья входит в мобильное приложение по логину и паролю, которые вы ему передали. Назначить судью на матч можно
        в списке матчей этапа.
      </p>

      <ErrorText error={users.error ?? assignments.error} />
      {users.isPending && <Loading />}

      {users.data && referees.length === 0 && (
        <EmptyState icon="flag" title="Судей пока нет" action={createButton}>
          Создайте аккаунт судьи — после этого его можно назначать на матчи.
        </EmptyState>
      )}

      {referees.length > 0 && (
        <AccountsTable
          users={referees}
          extraColumn={{
            title: 'Назначения',
            render: (user) => {
              const count = matchCounts.get(user.id) ?? 0
              return count > 0 ? plural(count, ['матч', 'матча', 'матчей']) : <span className="muted">нет</span>
            },
          }}
        />
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый судья">
        <CreateAccountForm roles={['Referee']} onDone={() => setCreating(false)} />
      </Modal>
    </>
  )
}
