import { useOutletContext } from 'react-router'
import type { Stage, Tournament } from './types'

/** Данные, которые StageLayout передаёт вкладкам этапа. */
export interface StageOutletContext {
  tournament: Tournament
  stage: Stage
  /** Адрес этапа — от него строятся ссылки на вкладки. */
  basePath: string
}

export const useStageOutlet = () => useOutletContext<StageOutletContext>()
