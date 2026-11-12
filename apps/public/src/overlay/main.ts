/**
 * Трансляционный оверлей: /overlay.html?match=<id>.
 * Без React и роутера — DOM строится один раз, дальше меняется только изменившийся текст.
 * Источник истины — REST витрины; SignalR лишь сигналит «перечитай», опрос страхует разрыв.
 * Демо без сервера: /overlay.html?demo (с подложкой-газоном: ?demo&bg).
 */
import './overlay.css'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { publicApi } from '@/api/publicApi'
import type { PublicEvent, PublicMatch, PublicMatchPage } from '@/api/types'
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
    <div class="bug-meta" data-ref="meta"></div>
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
`

const ref = <T extends HTMLElement = HTMLElement>(name: string) =>
  root.querySelector<T>(`[data-ref="${name}"]`)!

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
  meta: ref('meta'),
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
  setText(el.meta, [next.leagueName, competitionLabel(next.stageName, next.divisionName)].filter(Boolean).join(' · '))

  // Счёт вырос — короткая вспышка блока счёта. Отмена гола (счёт уменьшился) — без вспышки.
  if (shownScore && next.homeScore + next.awayScore > shownScore[0] + shownScore[1]) {
    el.score.classList.remove('is-flash')
    void el.score.offsetWidth
    el.score.classList.add('is-flash')
  }
  shownScore = [next.homeScore, next.awayScore]

  renderClock()
}

function periodLabel(current: PublicMatch): string {
  const period = Math.max(1, current.currentPeriod)
  return current.periodsCount === 2 ? `${period}Т` : `${period} пер`
}

/** Часы как в ТВ-табло: время матча непрерывно, второй тайм 25-минутных периодов идёт с 25:00. */
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
    const elapsed = periodElapsedSeconds(match) ?? 0
    const offset = (Math.max(1, match.currentPeriod) - 1) * (match.periodDurationMinutes ?? 0) * 60
    const total = offset + elapsed

    period = periodLabel(match)
    time = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    stopped = match.status === 'Pause'
  }

  setText(el.period, period)
  setText(el.time, time)
  el.clock.classList.toggle('is-stopped', stopped)
}

// Тикаем чаще секунды, чтобы смена цифры не отставала; DOM трогаем только при смене строки.
setInterval(renderClock, 250)

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

function createApiSource(matchId: string): MatchSource {
  return {
    load: () => publicApi.match(matchId),
    subscribe(onChange) {
      const connection = new HubConnectionBuilder()
        .withUrl('/hubs/matches')
        // Переподключаемся бесконечно: оверлей может висеть в эфире часами.
        .withAutomaticReconnect({ nextRetryDelayInMilliseconds: () => RETRY_MS })
        .configureLogging(LogLevel.Warning)
        .build()
      const join = async () => {
        try {
          await connection.invoke('SubscribeMatch', matchId)
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
      handleEvents(page)
      el.bug.classList.add('is-visible')
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
const matchId = params.get('match')

if (params.has('demo')) {
  void import('./demo').then(({ createDemoSource }) => startOverlay(createDemoSource(params.has('bg'))))
} else if (matchId) {
  startOverlay(createApiSource(matchId))
} else {
  root.textContent = 'Укажите матч: /overlay.html?match=<id матча>'
  root.style.cssText = 'color:#fff;font:600 2rem sans-serif;padding:2rem;background:#0a1322cc;inset:auto;'
}
