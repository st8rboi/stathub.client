import { useCallback, useState, type ReactNode } from 'react'
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './confirmContext'
import { Modal } from './Modal'

interface PendingConfirm {
  options: ConfirmOptions
  resolve: (confirmed: boolean) => void
}

/** Один диалог подтверждения на всё приложение; вызывается через useConfirm(). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback<ConfirmFn>(
    (input) =>
      new Promise<boolean>((resolve) => {
        const options = typeof input === 'string' ? { title: input } : input
        setPending((previous) => {
          // Новый запрос вытесняет незакрытый — прежний считаем отменённым.
          previous?.resolve(false)
          return { options, resolve }
        })
      }),
    [],
  )

  const finish = (confirmed: boolean) => {
    pending?.resolve(confirmed)
    setPending(null)
  }

  const options = pending?.options

  return (
    <ConfirmContext value={confirm}>
      {children}

      <Modal
        open={pending !== null}
        onClose={() => finish(false)}
        title={options?.title ?? ''}
        size="sm"
        footer={
          <>
            <button type="button" className="secondary" onClick={() => finish(false)}>
              {options?.cancelLabel ?? 'Отмена'}
            </button>
            <button
              type="button"
              className={options?.danger ? 'danger-solid' : undefined}
              onClick={() => finish(true)}
              autoFocus
            >
              {options?.confirmLabel ?? 'Подтвердить'}
            </button>
          </>
        }
      >
        {options?.message && <p>{options.message}</p>}
      </Modal>
    </ConfirmContext>
  )
}
