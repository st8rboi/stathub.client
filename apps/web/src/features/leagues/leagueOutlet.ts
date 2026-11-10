import { useOutletContext } from 'react-router'
import type { League } from './types'

/** Данные, которые LeagueLayout передаёт вкладкам лиги: лига уже загружена. */
export interface LeagueOutletContext {
  league: League
}

export const useLeagueOutlet = () => useOutletContext<LeagueOutletContext>()
