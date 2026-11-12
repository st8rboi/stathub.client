/**
 * Демо оверлея без сервера: /overlay.html?demo — идёт матч, каждые 12 секунд новое событие
 * (гол, жёлтая, красная, автогол). Удобно выставить положение оверлея в приложении трансляции.
 * ?demo&bg — с подложкой-газоном, для скриншотов. Грузится отдельным чанком только в демо.
 */
import type { PublicEvent, PublicMatchPage } from '@/api/types'
import type { MatchSource } from './main'

const svg = (body: string) => 'data:image/svg+xml,' + encodeURIComponent(body)

const crest = (fill: string, letter: string) =>
  svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M20 2 36 7v13c0 9-7 15-16 18C11 35 4 29 4 20V7z" fill="${fill}" stroke="#fff" stroke-width="2"/><text x="20" y="26" font-family="Arial" font-weight="700" font-size="15" fill="#fff" text-anchor="middle">${letter}</text></svg>`,
  )

const photo = (shirt: string) =>
  svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d8aa0"/><stop offset="1" stop-color="#3a4558"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/><circle cx="50" cy="40" r="17" fill="#d9c2ad"/><path d="M50 22c-11 0-17 7-17 14 6-5 26-5 34 0 0-7-6-14-17-14z" fill="#3b2a20"/><path d="M14 100c2-22 17-32 36-32s34 10 36 32z" fill="${shirt}"/></svg>`,
  )

const HOME = { id: 'home', name: 'Динамо', logo: crest('#1d4fa3', 'Д'), shirt: '#1d4fa3' }
const AWAY = { id: 'away', name: 'Спартак-2', logo: crest('#c8102e', 'С'), shirt: '#c8102e' }

const SCRIPT: { type: string; team: typeof HOME; player: string; withPhoto: boolean }[] = [
  { type: 'Goal', team: HOME, player: 'Сажин Алексей Николаевич', withPhoto: true },
  { type: 'YellowCard', team: AWAY, player: 'Белоусов Никита', withPhoto: true },
  { type: 'RedCard', team: AWAY, player: 'Константинопольский Илья', withPhoto: false },
  { type: 'OwnGoal', team: AWAY, player: 'Ким Виктор', withPhoto: true },
]

const STEP_MS = 12_000
const PERIOD_MINUTES = 25

export function createDemoSource(withBackground: boolean): MatchSource {
  if (withBackground) {
    document.body.style.background =
      'radial-gradient(ellipse at 50% 40%, transparent 30%, rgb(0 0 0 / 55%) 100%), repeating-linear-gradient(90deg, #2f7a3a 0 8rem, #34853f 8rem 16rem)'
  }

  const startedMs = Date.now()
  // Второй тайм идёт 13-ю минуту: часы покажут 37:xx.
  const periodStartedMs = startedMs - (12 * 60 + 10) * 1000
  const events: PublicEvent[] = []
  let listener: (() => void) | null = null
  let step = 0

  const page = (): PublicMatchPage => {
    let homeScore = 0
    let awayScore = 0
    for (const event of events) {
      if (event.type !== 'Goal' && event.type !== 'OwnGoal') continue
      // Автогол засчитывается сопернику команды игрока.
      const homeScores = (event.teamId === HOME.id) === (event.type === 'Goal')
      if (homeScores) homeScore += 1
      else awayScore += 1
    }

    return {
      match: {
        id: 'demo',
        stageId: 'demo',
        stageName: '5 тур',
        tournamentName: 'Сезон 2026',
        leagueName: 'Лига Банзай',
        leagueSlug: 'demo',
        leagueLogoUrl: null,
        homeTeamId: HOME.id,
        homeTeamName: HOME.name,
        homeTeamLogoUrl: HOME.logo,
        awayTeamId: AWAY.id,
        awayTeamName: AWAY.name,
        awayTeamLogoUrl: AWAY.logo,
        status: 'InProgress',
        homeScore,
        awayScore,
        currentPeriod: 2,
        periodsCount: 2,
        scheduledTimeUtc: new Date(startedMs).toISOString(),
        startedAtUtc: new Date(startedMs).toISOString(),
        periodStartedAtUtc: new Date(periodStartedMs).toISOString(),
        pausedAtUtc: null,
        periodPausedMilliseconds: 0,
        periodDurationMinutes: PERIOD_MINUTES,
        divisionName: null,
      },
      events: [...events],
    }
  }

  const fire = () => {
    const item = SCRIPT[step % SCRIPT.length]
    step += 1
    events.push({
      id: `demo-${step}`,
      type: item.type,
      teamId: item.team.id,
      teamName: item.team.name,
      playerName: item.player,
      playerPhotoUrl: item.withPhoto ? photo(item.team.shirt) : null,
      occurredAtUtc: new Date().toISOString(),
      isVoided: false,
      reason: null,
      period: 2,
      elapsedSeconds: Math.floor((Date.now() - periodStartedMs) / 1000),
    })
    listener?.()
  }

  return {
    load: async () => page(),
    subscribe(onChange) {
      listener = onChange
      setTimeout(fire, 2500)
      setInterval(fire, STEP_MS)
    },
  }
}
