import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children?: ReactNode
  /** Кнопки внизу окна. */
  footer?: ReactNode
  size?: 'sm' | 'md'
}

/**
 * Модальное окно на нативном <dialog>: фокус-ловушка, Escape и затемнение фона
 * даёт браузер. Клик по затемнению закрывает окно. На телефоне — нижняя шторка.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`modal modal--${size}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape: закрываем через состояние родителя, а не силами браузера.
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // У <dialog> нет внутренних отступов, поэтому клик по нему самому — это клик по фону.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open && (
        <div className="modal-panel">
          <header className="modal-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose}>
              <Icon name="close" />
            </button>
          </header>
          {children && <div className="modal-body">{children}</div>}
          {footer && <footer className="modal-foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
