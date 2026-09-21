import { createContext, useContext } from 'react'

export interface OrganizerContextValue {
  organizerId: string
  setOrganizerId: (id: string) => void
}

export const OrganizerContext = createContext<OrganizerContextValue | null>(null)

export function useOrganizer() {
  const context = useContext(OrganizerContext)
  if (!context) throw new Error('useOrganizer must be used within OrganizerProvider')
  return context
}

export const isGuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
