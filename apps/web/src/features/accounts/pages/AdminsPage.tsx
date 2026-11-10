import { useState } from 'react'
import { plural } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { EmptyState, Loading, PageHeader } from '@/shared/ui/layout'
import { Modal } from '@/shared/ui/Modal'
import { AccountsTable } from '../components/AccountsTable'
import { CreateAccountForm } from '../components/CreateAccountForm'
import { useAccounts } from '../hooks'
import { ADMIN_ROLES } from '../labels'

/**
 * Администраторы организации: организатор (выдаёт платформа) и администраторы,
 * которых организатор заводит сам.
 */
export default function AdminsPage() {
  const users = useAccounts()
  const [creating, setCreating] = useState(false)

  const admins = (users.data ?? [])
    .filter((user) => ADMIN_ROLES.includes(user.role))
    // Организаторы — первыми.
    .sort((a, b) => ADMIN_ROLES.indexOf(a.role) - ADMIN_ROLES.indexOf(b.role))

  const createButton = (
    <button type="button" onClick={() => setCreating(true)}>
      <Icon name="plus" size={18} />
      Новый администратор
    </button>
  )

  return (
    <>
      <PageHeader
        title="Администраторы"
        meta={
          users.data &&
          admins.length > 0 && <span>{plural(admins.length, ['аккаунт', 'аккаунта', 'аккаунтов'])}</span>
        }
        actions={createButton}
      />
      <p className="hint page-intro">
        Администраторы ведут лиги, турниры и матчи в этой админке. Второго организатора выдаёт только платформа.
      </p>

      <ErrorText error={users.error} />
      {users.isPending && <Loading />}

      {users.data && admins.length === 0 && (
        <EmptyState icon="user" title="Администраторов нет" action={createButton}>
          Добавьте помощника, чтобы вести соревнования вместе.
        </EmptyState>
      )}

      {admins.length > 0 && <AccountsTable users={admins} showRole />}

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый администратор">
        <CreateAccountForm roles={['Admin']} onDone={() => setCreating(false)} />
      </Modal>
    </>
  )
}
