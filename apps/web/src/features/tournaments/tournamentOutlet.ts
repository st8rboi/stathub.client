import { useOutletContext } from 'react-router'
import type { Tournament } from './types'

/** Данные, которые TournamentLayout передаёт вкладкам турнира: турнир уже загружен. */
export interface TournamentOutletContext {
  tournament: Tournament
}

export const useTournamentOutlet = () => useOutletContext<TournamentOutletContext>()
