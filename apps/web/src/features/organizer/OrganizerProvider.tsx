import { useState, type ReactNode } from 'react'
import { OrganizerContext } from './organizerContext'

const STORAGE_KEY = 'stathub.organizerId'

// Пока нет Identity, организатор — это просто GUID, который админ вводит вручную (хранится в localStorage)
export function OrganizerProvider({ children }: { children: ReactNode }) {
  const [organizerId, setState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })

  const setOrganizerId = (id: string) => {
    setState(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // localStorage недоступен — работаем без сохранения
    }
  }

  return <OrganizerContext value={{ organizerId, setOrganizerId }}>{children}</OrganizerContext>
}
