import { createContext, useContext, type ReactNode } from 'react'

export interface ConfirmOptions {
  title: string
  message?: ReactNode
  /** Текст кнопки подтверждения (по умолчанию «Подтвердить»). */
  confirmLabel?: string
  cancelLabel?: string
  /** Необратимое или разрушительное действие — красная кнопка. */
  danger?: boolean
}

export type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>

export const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Замена window.confirm: стилизованный диалог, промис резолвится true/false.
 * Использование: `void confirm({ title, danger: true }).then((ok) => ok && remove.mutate(id))`.
 */
export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider')
  return context
}
