import { useEffect, useState } from 'react'

/** Значение «только для чтения» с кнопкой копирования (идентификаторы для API и поддержки). */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <div className="copy-field">
      <span className="copy-field-label">{label}</span>
      <code className="copy-field-value">{value}</code>
      <button
        type="button"
        className="ghost"
        onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))}
      >
        {copied ? 'Скопировано' : 'Копировать'}
      </button>
    </div>
  )
}
