import { useEffect, useRef, useState } from 'react'

/** Значение «только для чтения» с кнопкой копирования (идентификаторы для API и поддержки). */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const valueRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      // Clipboard API есть только на HTTPS и localhost.
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        return
      }
    } catch {
      // нет разрешения — пробуем запасной путь
    }

    // Запасной путь: выделяем значение (даже если копирование не удастся, останется нажать Ctrl+C).
    const element = valueRef.current
    const selection = window.getSelection()
    if (!element || !selection) return

    const range = document.createRange()
    range.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(range)

    try {
      if (document.execCommand('copy')) setCopied(true)
    } catch {
      // значение осталось выделенным
    }
  }

  return (
    <div className="copy-field">
      <span className="copy-field-label">{label}</span>
      <code ref={valueRef} className="copy-field-value">
        {value}
      </code>
      <button type="button" className="ghost" onClick={() => void copy()}>
        {copied ? 'Скопировано' : 'Копировать'}
      </button>
    </div>
  )
}
