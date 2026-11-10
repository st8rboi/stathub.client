import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from './Icon'

const VIEWPORT_MARGIN = 8
const GAP = 6

interface MenuProps {
  /** Содержимое кнопки-триггера. */
  trigger: ReactNode
  /** Подпись для скринридера, если в триггере только иконка. */
  triggerLabel?: string
  triggerClassName?: string
  /** К какому краю триггера прижимать меню. */
  align?: 'start' | 'end'
  children: ReactNode
}

/**
 * Выпадающее меню. Попап позиционируется как fixed относительно триггера и прижимается
 * к краям экрана — поэтому его не обрезают контейнеры с overflow и узкий экран телефона.
 * Закрывается кликом мимо, Escape, прокруткой страницы и выбором пункта.
 */
export function Menu({ trigger, triggerLabel, triggerClassName, align = 'start', children }: MenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()

  useLayoutEffect(() => {
    const triggerElement = triggerRef.current
    const popover = popoverRef.current
    if (!open || !triggerElement || !popover) return

    const rect = triggerElement.getBoundingClientRect()
    const { offsetWidth: width, offsetHeight: height } = popover

    const preferredLeft = align === 'end' ? rect.right - width : rect.left
    const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN
    const left = Math.max(VIEWPORT_MARGIN, Math.min(preferredLeft, maxLeft))

    // Снизу не помещается, а сверху место есть — открываем вверх.
    const below = rect.bottom + GAP
    const above = rect.top - GAP - height
    const top = below + height > window.innerHeight - VIEWPORT_MARGIN && above > VIEWPORT_MARGIN ? above : below

    popover.style.left = `${left}px`
    popover.style.top = `${top}px`

    popover.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true })
  }, [open, align])

  useEffect(() => {
    if (!open) return

    const isInside = (target: EventTarget | null) =>
      target instanceof Node &&
      (popoverRef.current?.contains(target) === true || triggerRef.current?.contains(target) === true)

    const onPointerDown = (event: PointerEvent) => {
      if (!isInside(event.target)) setOpen(false)
    }
    const onScroll = (event: Event) => {
      // Прокрутка самого списка меню — не повод закрываться.
      if (!(event.target instanceof Node && popoverRef.current?.contains(event.target))) setOpen(false)
    }
    const onResize = () => setOpen(false)

    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()

    const items = [...(popoverRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    if (items.length === 0) return
    const index = items.indexOf(document.activeElement as HTMLElement)
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1
    items[(next + items.length) % items.length].focus()
  }

  return (
    <div className="menu">
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>

      {open && (
        <div
          ref={popoverRef}
          id={popoverId}
          className="menu-popover"
          role="menu"
          onKeyDown={onKeyDown}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('[role="menuitem"]')) setOpen(false)
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function MenuTitle({ children }: { children: ReactNode }) {
  return <p className="menu-title">{children}</p>
}

export function MenuEmpty({ children }: { children: ReactNode }) {
  return <p className="menu-empty">{children}</p>
}

/** Пункт-ссылка. Текущий пункт помечается галочкой и aria-current. */
export function MenuLink({
  to,
  label,
  hint,
  current = false,
}: {
  to: string
  label: ReactNode
  hint?: ReactNode
  current?: boolean
}) {
  return (
    <Link to={to} className="menu-item" role="menuitem" aria-current={current ? 'page' : undefined}>
      <span className="menu-item-text">
        <span className="menu-item-label">{label}</span>
        {hint && <span className="menu-item-hint">{hint}</span>}
      </span>
      {current && <Icon name="check" size={16} className="menu-item-check" />}
    </Link>
  )
}

/** Пункт-действие. `danger` — красный текст для удаления и подобного. */
export function MenuButton({
  children,
  onClick,
  danger = false,
  disabled = false,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={danger ? 'menu-item menu-item--danger' : 'menu-item'}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
