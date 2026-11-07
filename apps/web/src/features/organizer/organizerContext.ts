import { createContext, useContext } from 'react'

export interface OrganizerContextValue {
  /** Организация текущей сессии: приходит из токена, руками больше не задаётся. */
  organizerId: string
}

export const OrganizerContext = createContext<OrganizerContextValue | null>(null)

export function useOrganizer() {
  const context = useContext(OrganizerContext)
  if (!context) throw new Error('useOrganizer must be used within OrganizerProvider')
  return context
}
