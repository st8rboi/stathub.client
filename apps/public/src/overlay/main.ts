/**
 * Трансляционный оверлей: /overlay.html?match=<номер матча> (старые ссылки с Id тоже работают).
 * Без React и роутера — DOM строится один раз, дальше меняется только изменившийся текст.
 * Источник истины — REST витрины; SignalR лишь сигналит «перечитай», опрос страхует разрыв.
 * Демо без сервера: /overlay.html?demo (с подложкой-газоном: ?demo&bg, перерыв: ?demo&break,
 * превью до начала матча: ?demo&pre — через 10 секунд «судья» начинает матч).
 * До начала матча вместо табло снизу по центру висит превью: команды и логотип лиги.
 * Если статистику ведут: на 5:00, 10:00, … часов матча под табло выезжает плашка статистики,
 * а в перерыве между таймами по центру висит окно со статистикой тайма.
 */
import './overlay.css'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { publicApi } from '@/api/publicApi'
import type { PublicEvent, PublicMatch, PublicMatchPage, PublicMatchStatistics, PublicTeamStats } from '@/api/types'
import { competitionLabel, formatMinute, formatTime, isLiveMatch, periodElapsedSeconds } from '@/labels'

export type MatchSource = {
  load(): Promise<PublicMatchPage>
  /** Вызывает onChange, когда данные матча могли измениться. */
  subscribe(onChange: () => void): void
}

/** Сколько плашка висит на экране. */
const CARD_VISIBLE_MS = 8000
const CARD_OUT_MS = 450
const CARD_GAP_MS = 400
/** Если событий накопилось много (пропадала сеть), показываем только последние. */
const MAX_QUEUE = 3
const POLL_LIVE_MS = 15_000
const POLL_IDLE_MS = 60_000
const RETRY_MS = 5_000
/** Плашка статистики выезжает на каждой 5-й минуте часов матча и висит 15 секунд. */
const STATS_EVERY_SECONDS = 5 * 60
const STATS_VISIBLE_MS = 15_000
/**
 * Остановку после отыгранного тайма считаем перерывом не сразу: судья мог остановить игру
 * в добавленное время, и окно на полэкрана в этот момент было бы лишним.
 */
const HALFTIME_DELAY_MS = 30_000

const STAT_ROWS: { key: keyof PublicTeamStats; short: string; full: string }[] = [
  { key: 'expectedGoals', short: 'xG', full: 'Ожидаемые голы (xG)' },
  { key: 'shots', short: 'Удары', full: 'Удары' },
  { key: 'shotsOnTarget', short: 'В створ', full: 'Удары в створ' },
  { key: 'corners', short: 'Угловые', full: 'Угловые' },
  { key: 'fouls', short: 'Фолы', full: 'Фолы' },
]

const statRowsHtml = (label: 'short' | 'full') =>
  STAT_ROWS.map(
    (row) => `
      <div class="st-row" data-stat="${row.key}">
        <div class="st-values"><b></b><span>${row[label]}</span><b></b></div>
        <div class="st-bars"><i><u></u></i><i><u></u></i></div>
      </div>`,
  ).join('')

const SILHOUETTE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1b2a44"/><circle cx="50" cy="40" r="17" fill="#3a4d6d"/><path d="M14 100c2-22 17-32 36-32s34 10 36 32z" fill="#3a4d6d"/></svg>',
  )

const BALL_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m12 7 4.5 3.3-1.7 5.2H9.2L7.5 10.3z" fill="currentColor"/></svg>'

type CardKind = 'goal' | 'own-goal' | 'yellow' | 'red'

const CARD_KINDS: Record<string, CardKind> = {
  Goal: 'goal',
  OwnGoal: 'own-goal',
  YellowCard: 'yellow',
  RedCard: 'red',
}

const CARD_TAGS: Record<CardKind, string> = {
  goal: `${BALL_ICON}Гол`,
  'own-goal': `${BALL_ICON}Автогол`,
  yellow: '<span class="l3-card"></span>Жёлтая карточка',
  red: '<span class="l3-card"></span>Красная карточка',
}

type Card = {
  id: string
  kind: CardKind
  firstName: string
  lastName: string
  teamName: string
  teamLogoUrl: string | null
  photoUrl: string | null
  minute: string | null
  /** Счёт после гола. */
  score: string | null
}

// ---------- DOM ----------

const root = document.getElementById('overlay')!

root.innerHTML = `
  <div class="bug">
    <div class="bug-row">
      <div class="bug-team"><img class="bug-logo" alt="" hidden><span data-ref="homeName"></span></div>
      <div class="bug-score"><b data-ref="homeScore"></b><i></i><b data-ref="awayScore"></b></div>
      <div class="bug-team bug-team--away"><span data-ref="awayName"></span><img class="bug-logo" alt="" hidden></div>
      <div class="bug-clock"><small data-ref="period"></small><span data-ref="time"></span></div>
    </div>
    <div class="bug-accent"></div>
    <div class="bug-stats" data-ref="stats">${statRowsHtml('short')}</div>
  </div>
  <div class="pre">
    <div class="pre-row">
      <div class="pre-team"><span data-ref="preHome"></span><img class="pre-logo" alt="" hidden></div>
      <div class="pre-league"><img alt="" data-ref="preLeagueLogo" hidden><span data-ref="preVs">VS</span></div>
      <div class="pre-team pre-team--away"><img class="pre-logo" alt="" hidden><span data-ref="preAway"></span></div>
    </div>
    <div class="pre-info" data-ref="preInfo"></div>
  </div>
  <div class="l3" aria-live="polite">
    <div class="l3-photo"><img alt="" data-ref="photo"></div>
    <div class="l3-strip"></div>
    <div class="l3-body">
      <div class="l3-tag" data-ref="tag"></div>
      <div class="l3-name">
        <div class="l3-first" data-ref="firstName"></div>
        <div class="l3-last" data-ref="lastName"></div>
      </div>
      <div class="l3-meta" data-ref="cardMeta"></div>
    </div>
  </div>
  <div class="ht">
    <div class="ht-head"><span class="ht-tag">Перерыв</span><span data-ref="htTitle"></span></div>
    <div class="ht-teams">
      <div class="ht-team"><img class="ht-logo" alt="" hidden><span data-ref="htHome"></span></div>
      <div class="ht-score" data-ref="htScore"></div>
      <div class="ht-team ht-team--away"><span data-ref="htAway"></span><img class="ht-logo" alt="" hidden></div>
    </div>
    <div class="ht-stats">${statRowsHtml('full')}</div>
  </div>
`

const ref = <T extends HTMLElement = HTMLElement>(name: string) => root.querySelector<T>(`[data-ref="${name}"]`)!

const el = {
  bug: root.querySelector<HTMLElement>('.bug')!,
  homeLogo: root.querySelectorAll<HTMLImageElement>('.bug-logo')[0],
  awayLogo: root.querySelectorAll<HTMLImageElement>('.bug-logo')[1],
  homeName: ref('homeName'),
  awayName: ref('awayName'),
  score: root.querySelector<HTMLElement>('.bug-score')!,
  homeScore: ref('homeScore'),
  awayScore: ref('awayScore'),
  clock: root.querySelector<HTMLElement>('.bug-clock')!,
  period: ref('period'),
  time: ref('time'),
  stats: ref('stats'),
  preview: root.querySelector<HTMLElement>('.pre')!,
  preHomeLogo: root.querySelectorAll<HTMLImageElement>('.pre-logo')[0],
  preAwayLogo: root.querySelectorAll<HTMLImageElement>('.pre-logo')[1],
  preHome: ref('preHome'),
  preAway: ref('preAway'),
  preLeagueLogo: ref<HTMLImageElement>('preLeagueLogo'),
  preVs: ref('preVs'),
  preInfo: ref('preInfo'),
  halftime: root.querySelector<HTMLElement>('.ht')!,
  htTitle: ref('htTitle'),
  htHomeLogo: root.querySelectorAll<HTMLImageElement>('.ht-logo')[0],
  htAwayLogo: root.querySelectorAll<HTMLImageElement>('.ht-logo')[1],
  htHome: ref('htHome'),
  htAway: ref('htAway'),
  htScore: ref('htScore'),
  card: root.querySelector<HTMLElement>('.l3')!,
  photoBox: root.querySelector<HTMLElement>('.l3-photo')!,
  photo: ref<HTMLImageElement>('photo'),
  tag: ref('tag'),
  firstName: ref('firstName'),
  lastName: ref('lastName'),
  cardMeta: ref('cardMeta'),
}

/** Пишем в DOM только изменившееся — иначе браузер пересчитывает раскладку зря. */
function setText(node: HTMLElement, value: string) {
  if (node.textContent !== value) node.textContent = value
}

function setLogo(img: HTMLImageElement, url: string | null) {
  const src = url ?? ''
  if (img.getAttribute('src') !== src) {
    if (src) img.src = src
    else img.removeAttribute('src')
  }
  img.hidden = !src
}

el.photo.addEventListener('error', () => {
  if (el.photo.src !== SILHOUETTE) {
    el.photo.src = SILHOUETTE
    el.photoBox.classList.remove('is-logo')
  }
})

// ---------- Табло ----------

let match: PublicMatch | null = null
let shownScore: [number, number] | null = null

function renderBug(next: PublicMatch) {
  match = next

  setLogo(el.homeLogo, next.homeTeamLogoUrl)
  setLogo(el.awayLogo, next.awayTeamLogoUrl)
  setText(el.homeName, next.homeTeamName)
  setText(el.awayName, next.awayTeamName)
  setText(el.homeScore, String(next.homeScore))
  setText(el.awayScore, String(next.awayScore))
  setLogo(el.htHomeLogo, next.homeTeamLogoUrl)
  setLogo(el.htAwayLogo, next.awayTeamLogoUrl)
  setText(el.htHome, next.homeTeamName)
  setText(el.htAway, next.awayTeamName)
  setText(el.htScore, `${next.homeScore} : ${next.awayScore}`)

  // Счёт вырос — короткая вспышка блока счёта. Отмена гола (счёт уменьшился) — без вспышки.
  if (shownScore && next.homeScore + next.awayScore > shownScore[0] + shownScore[1]) {
    el.score.classList.remove('is-flash')
    void el.score.offsetWidth
    el.score.classList.add('is-flash')
  }
  shownScore = [next.homeScore, next.awayScore]

  renderClock()
}

// ---------- Превью до начала матча ----------

/**
 * Пока матч только запланирован, табло прячем, а снизу по центру висит плашка «команда — лига — команда».
 * Судья начал матч — превью уезжает, выезжает табло.
 */
function renderPreview(next: PublicMatch): boolean {
  const scheduled = next.status === 'Scheduled'

  setLogo(el.preHomeLogo, next.homeTeamLogoUrl)
  setLogo(el.preAwayLogo, next.awayTeamLogoUrl)
  setText(el.preHome, next.homeTeamName)
  setText(el.preAway, next.awayTeamName)
  setLogo(el.preLeagueLogo, next.leagueLogoUrl)
  el.preVs.hidden = !!next.leagueLogoUrl

  const info = [next.leagueName, competitionLabel(next.stageName, next.divisionName)]
  if (scheduled) info.push(`Начало ${formatTime(next.scheduledTimeUtc)}`)
  setText(el.preInfo, info.filter(Boolean).join('  ·  '))

  el.preview.classList.toggle('is-in', scheduled)
  return scheduled
}

function periodLabel(current: PublicMatch): string {
  const period = Math.max(1, current.currentPeriod)
  return current.periodsCount === 2 ? `${period}Т` : `${period} пер`
}

/** Часы матча в секундах: время непрерывно, второй тайм 25-минутных периодов идёт с 25:00. */
function matchSeconds(current: PublicMatch): number {
  const elapsed = periodElapsedSeconds(current) ?? 0
  const offset = (Math.max(1, current.currentPeriod) - 1) * (current.periodDurationMinutes ?? 0) * 60
  return offset + elapsed
}

/** Часы как в ТВ-табло. */
function renderClock() {
  if (!match) return

  let period = ''
  let time = ''
  let stopped = false

  if (match.status === 'Scheduled') {
    period = 'Начало'
    time = formatTime(match.scheduledTimeUtc)
  } else if (match.status === 'Finished') {
    time = 'Финал'
  } else if (match.status === 'Cancelled') {
    time = 'Отменён'
  } else if (isLiveMatch(match.status)) {
    const total = matchSeconds(match)

    period = periodLabel(match)
    time = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    stopped = match.status === 'Pause'
  }

  setText(el.period, period)
  setText(el.time, time)
  el.clock.classList.toggle('is-stopped', stopped)
}

// Тикаем чаще секунды, чтобы смена цифры не отставала; DOM трогаем только при смене строки.
setInterval(() => {
  renderClock()
  renderStatsSchedule()
}, 250)

// ---------- Статистика ----------

let statistics: PublicMatchStatistics | null = null
let statsHideTimer: number | undefined
/** 5-минутка часов матча на прошлом тике: плашка выезжает при переходе на следующую. */
let lastMark: number | null = null

// Строки и плашки под табло, и окна перерыва.
const statRows = Array.from(root.querySelectorAll<HTMLElement>('.st-row'), (row) => {
  const [homeValue, awayValue] = row.querySelectorAll<HTMLElement>('.st-values b')
  const [homeBar, awayBar] = row.querySelectorAll<HTMLElement>('.st-bars i')
  return { key: row.dataset.stat as keyof PublicTeamStats, homeValue, awayValue, homeBar, awayBar }
})

/** Значения обновляются и пока статистика на экране — счёт ударов может смениться при показе. */
function renderStats(next: PublicMatchStatistics | null | undefined) {
  statistics = next ?? null
  if (!statistics) {
    hideStats()
    el.halftime.classList.remove('is-in')
    return
  }

  for (const row of statRows) {
    const home = statistics.home[row.key]
    const away = statistics.away[row.key]
    const total = home + away
    const format = (value: number) => (row.key === 'expectedGoals' ? value.toFixed(2) : String(value))
    const share = (value: number) => `${total === 0 ? 0 : (value / total) * 100}%`

    setText(row.homeValue, format(home))
    setText(row.awayValue, format(away))
    row.homeValue.classList.toggle('is-lead', total > 0 && home >= away)
    row.awayValue.classList.toggle('is-lead', total > 0 && away >= home)
    row.homeBar.classList.toggle('is-lead', total > 0 && home >= away)
    row.awayBar.classList.toggle('is-lead', total > 0 && away >= home)
    row.homeBar.style.setProperty('--share', share(home))
    row.awayBar.style.setProperty('--share', share(away))
  }
}

/**
 * Перерыв между периодами. В домене это обычная пауза, поэтому отличаем её по часам:
 * новый период уже объявлен, но игра не возобновлена, — или период отыгран целиком,
 * впереди есть следующий и пауза длится дольше HALFTIME_DELAY_MS.
 * Возвращает номер завершённого периода или null.
 */
function breakAfterPeriod(current: PublicMatch): number | null {
  if (current.status !== 'Pause') return null

  const elapsed = periodElapsedSeconds(current) ?? 0
  if (current.currentPeriod > 1 && elapsed === 0) return current.currentPeriod - 1

  const duration = (current.periodDurationMinutes ?? 0) * 60
  if (duration === 0 || elapsed < duration || current.currentPeriod >= current.periodsCount) return null

  const pausedMs = current.pausedAtUtc ? Date.now() - new Date(current.pausedAtUtc).getTime() : 0
  return pausedMs >= HALFTIME_DELAY_MS ? current.currentPeriod : null
}

/**
 * В перерыве после первого периода итог матча и есть статистика тайма.
 * Сервер отдаёт только итог, поэтому после следующих периодов честно пишем «матча».
 */
function halftimeTitle(period: number, periodsCount: number): string {
  if (period !== 1) return 'Статистика матча'
  return periodsCount === 2 ? 'Статистика 1-го тайма' : 'Статистика 1-го периода'
}

function renderStatsSchedule() {
  if (!match) return

  const period = statistics ? breakAfterPeriod(match) : null
  if (period !== null) {
    hideStats()
    setText(el.htTitle, halftimeTitle(period, match.periodsCount))
  }
  el.halftime.classList.toggle('is-in', period !== null)

  if (!isLiveMatch(match.status)) {
    lastMark = null
    return
  }

  // Оверлей открыли посреди матча — ждём следующую 5-минутку, а не показываем сразу.
  const mark = Math.floor(matchSeconds(match) / STATS_EVERY_SECONDS)
  if (lastMark !== null && mark > lastMark && match.status === 'InProgress') showStats()
  lastMark = mark
}

function showStats() {
  if (!statistics) return
  window.clearTimeout(statsHideTimer)
  el.stats.classList.add('is-in')
  statsHideTimer = window.setTimeout(hideStats, STATS_VISIBLE_MS)
}

function hideStats() {
  window.clearTimeout(statsHideTimer)
  el.stats.classList.remove('is-in')
}

// ---------- Плашки событий ----------

const seenEvents = new Set<string>()
let initialized = false
const queue: Card[] = []
/** Плашка, которая сейчас готовится или на экране. */
let current: Card | null = null
let hideTimer: number | undefined

function splitName(fullName: string): { firstName: string; lastName: string } {
  const [lastName = fullName, firstName = ''] = fullName.trim().split(/\s+/)
  return { firstName, lastName }
}

function buildCards(page: PublicMatchPage): Map<string, Card> {
  const { match: m, events } = page
  const cards = new Map<string, Card>()
  let home = 0
  let away = 0

  for (const event of events) {
    const kind = CARD_KINDS[event.type]
    if (!kind || !event.playerName) continue

    const isAway = event.teamId ? event.teamId === m.awayTeamId : event.teamName === m.awayTeamName
    let score: string | null = null

    if ((kind === 'goal' || kind === 'own-goal') && !event.isVoided) {
      // Автогол засчитывается сопернику команды игрока.
      const awayScores = kind === 'own-goal' ? !isAway : isAway
      if (awayScores) away += 1
      else home += 1
      score = `${home} : ${away}`
    }

    cards.set(event.id, {
      id: event.id,
      kind,
      ...splitName(event.playerName),
      teamName: event.teamName ?? (isAway ? m.awayTeamName : m.homeTeamName),
      teamLogoUrl: isAway ? m.awayTeamLogoUrl : m.homeTeamLogoUrl,
      photoUrl: event.playerPhotoUrl ?? null,
      minute: minuteOf(event, m),
      score,
    })
  }

  return cards
}

function minuteOf(event: PublicEvent, m: PublicMatch): string | null {
  if (event.elapsedSeconds == null) return null
  return formatMinute(event.period ?? m.currentPeriod, event.elapsedSeconds, m.periodDurationMinutes)
}

function handleEvents(page: PublicMatchPage) {
  const cards = buildCards(page)

  // При открытии оверлея старые события не всплывают — только то, что случится дальше.
  if (!initialized) {
    for (const event of page.events) seenEvents.add(event.id)
    initialized = true
    return
  }

  const fresh: Card[] = []
  for (const event of page.events) {
    if (seenEvents.has(event.id)) continue
    seenEvents.add(event.id)
    const card = cards.get(event.id)
    if (card && !event.isVoided) fresh.push(card)
  }

  for (const event of page.events) {
    if (event.isVoided) dropCard(event.id)
  }

  if (fresh.length === 0) return
  queue.push(...fresh)
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE)
  if (!current) void showNext()
}

/** Ждём фото заранее, чтобы плашка не выезжала с пустым квадратом; но не дольше 1,5 с. */
function preload(url: string | null): Promise<void> {
  if (!url) return Promise.resolve()
  const image = new Image()
  image.src = url
  return Promise.race([
    image.decode().catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, 1500)),
  ])
}

async function showNext() {
  const card = queue.shift()
  current = card ?? null
  if (!card) return

  await preload(card.photoUrl ?? card.teamLogoUrl)
  // Пока грузилось фото, событие могли отменить.
  if (current !== card) return

  const photo = card.photoUrl ?? card.teamLogoUrl ?? SILHOUETTE
  el.photo.src = photo
  el.photoBox.classList.toggle('is-logo', !card.photoUrl && !!card.teamLogoUrl)
  el.tag.innerHTML = CARD_TAGS[card.kind]
  setText(el.firstName, card.firstName)
  setText(el.lastName, card.lastName)

  el.cardMeta.replaceChildren()
  if (card.teamLogoUrl) {
    const logo = document.createElement('img')
    logo.src = card.teamLogoUrl
    logo.alt = ''
    el.cardMeta.append(logo)
  }
  el.cardMeta.append(card.teamName)
  for (const [text, bold] of [
    [card.minute, false],
    [card.score, true],
  ] as const) {
    if (!text) continue
    const node = document.createElement(bold ? 'b' : 'span')
    node.textContent = text
    el.cardMeta.append(document.createElement('i'), node)
  }

  el.card.className = `l3 l3--${card.kind}`
  void el.card.offsetWidth
  el.card.classList.add('is-in')
  hideTimer = window.setTimeout(() => hideCard(card), CARD_VISIBLE_MS)
}

function hideCard(card: Card) {
  if (current !== card) return
  window.clearTimeout(hideTimer)
  el.card.classList.replace('is-in', 'is-out')

  window.setTimeout(() => {
    el.card.classList.remove('is-out')
    current = null
    window.setTimeout(() => {
      if (!current) void showNext()
    }, CARD_GAP_MS)
  }, CARD_OUT_MS)
}

/** Судья отменил событие: убираем из очереди, а с экрана — досрочно. */
function dropCard(id: string) {
  const index = queue.findIndex((card) => card.id === id)
  if (index >= 0) queue.splice(index, 1)

  if (current?.id !== id) return
  if (el.card.classList.contains('is-in')) {
    hideCard(current)
  } else {
    current = null
    void showNext()
  }
}

// ---------- Данные ----------

/**
 * Матч задаётся коротким номером (?match=125 — так удобно вбивать вручную) или Id (старые ссылки).
 * Подписка SignalR идёт по Id: в режиме номера он известен после первой загрузки.
 */
function createApiSource(matchParam: string): MatchSource {
  const number = /^\d+$/.test(matchParam) ? Number(matchParam) : null
  let resolveId: ((id: string) => void) | null = null
  const matchId =
    number === null ? Promise.resolve(matchParam) : new Promise<string>((resolve) => (resolveId = resolve))

  return {
    load: async () => {
      const page = number === null ? await publicApi.match(matchParam) : await publicApi.matchByNumber(number)
      resolveId?.(page.match.id)
      return page
    },
    subscribe(onChange) {
      const connection = new HubConnectionBuilder()
        .withUrl('/hubs/matches')
        // Переподключаемся бесконечно: оверлей может висеть в эфире часами.
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: () => RETRY_MS,
        })
        .configureLogging(LogLevel.Warning)
        .build()
      const join = async () => {
        try {
          await connection.invoke('SubscribeMatch', await matchId)
          onChange()
        } catch {
          // Подписка не прошла — выручит опрос.
        }
      }
      const start = async () => {
        try {
          await connection.start()
          await join()
        } catch {
          setTimeout(() => void start(), RETRY_MS)
        }
      }
      connection.on('MatchUpdated', onChange)
      connection.onreconnected(() => void join())
      void start()
    },
  }
}

function startOverlay(source: MatchSource) {
  let loading = false
  let pending = false
  let pollTimer: number | undefined

  const schedulePoll = (ms: number) => {
    window.clearTimeout(pollTimer)
    pollTimer = window.setTimeout(() => void refresh(), ms)
  }

  const refresh = async () => {
    // Несколько пушей подряд схлопываются в один запрос.
    if (loading) {
      pending = true
      return
    }
    loading = true

    try {
      const page = await source.load()
      renderBug(page.match)
      renderStats(page.statistics)
      handleEvents(page)
      const preview = renderPreview(page.match)
      el.bug.classList.toggle('is-visible', !preview)
      schedulePoll(isLiveMatch(page.match.status) ? POLL_LIVE_MS : POLL_IDLE_MS)
    } catch {
      schedulePoll(RETRY_MS)
    } finally {
      loading = false
      if (pending) {
        pending = false
        void refresh()
      }
    }
  }

  // Шрифт грузится до первого показа, чтобы табло не «прыгало» при подмене шрифта.
  void document.fonts.ready.then(() => void refresh())
  source.subscribe(() => void refresh())
}

const params = new URLSearchParams(location.search)
const matchParam = params.get('match')?.trim()

if (params.has('demo')) {
  void import('./demo').then(({ createDemoSource }) =>
    startOverlay(createDemoSource(params.has('bg'), params.has('break'), params.has('pre'))),
  )
} else if (matchParam) {
  startOverlay(createApiSource(matchParam))
} else {
  root.textContent = 'Укажите матч: /overlay.html?match=<номер матча>'
  root.style.cssText = 'color:#fff;font:600 2rem sans-serif;padding:2rem;background:#0a1322cc;inset:auto;'
}
