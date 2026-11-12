import { useLayoutEffect, useMemo, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import type { PublicMatch, StandingsGroup } from '@/api/types'
import { FixtureRow } from '@/components/FixtureRow'
import { Skeleton } from '@/components/Skeleton'
import { StandingsTable } from '@/components/StandingsTable'
import { useStage } from '@/hooks'
import { stageFormatLabels } from '@/labels'
import { currentRound, roundDates, splitIntoRounds, type Round } from '@/rounds'

const ALL = 'all'

/** Подпись тура: в круге — «5 тур», в плей-офф номера туров ничего не значат, только даты. */
function roundTitle(round: Round, playoff: boolean): string {
  return playoff ? roundDates(round) : `${round.number} тур`
}

function inGroup(match: PublicMatch, group: StandingsGroup | undefined): boolean {
  if (!group) return true
  return group.rows.some((row) => row.teamId === match.homeTeamId || row.teamId === match.awayTeamId)
}

export default function StagePage() {
  const { stageId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const stage = useStage(stageId)

  const matches = stage.data?.matches
  const groups = stage.data?.standingsGroups ?? []
  const groupParam = params.get('group') ?? ALL
  const group = groups.find((item) => item.groupId === groupParam)

  // Туры считаем по всем матчам этапа (группы играют одни и те же туры), фильтр группы — поверх.
  const rounds = useMemo(() => splitIntoRounds(matches ?? []), [matches])
  const roundParam = params.get('round')
  const selectedRound =
    roundParam === ALL ? undefined : (rounds.find((round) => round.key === roundParam) ?? currentRound(rounds))
  const roundKey = selectedRound?.key ?? ALL

  // Выбор тура и группы — в адресе (replace), чтобы «назад» со страницы матча возвращал туда же.
  const setParam = (name: string, value: string) =>
    setParams(
      (next) => {
        next.set(name, value)
        return next
      },
      { replace: true },
    )

  if (stage.error) return <p className="notice">Не удалось загрузить этап: {stage.error.message}</p>
  if (!stage.data) return <Skeleton rows={5} />

  const { stage: info, standings, standingsGroups, divisionStages } = stage.data
  // Дивизион показываем, только когда их несколько: тогда он и есть «соревнование» страницы.
  const multiDivision = info.divisionsCount > 1
  const hasSiblings = divisionStages.length > 1
  const playoff = info.formatType === 'Playoff'

  const visibleRounds = (selectedRound ? [selectedRound] : rounds)
    .map((round) => ({ round, matches: round.matches.filter((match) => inGroup(match, group)) }))
    .filter((item) => item.matches.length > 0)

  return (
    <>
      <p className="crumb">
        <Link to={`/leagues/${info.leagueSlug}`}>← {info.leagueName}</Link>
      </p>

      <div className="league-header">
        {info.leagueLogoUrl ? (
          <img src={info.leagueLogoUrl} alt="" className="league-hero-logo" />
        ) : (
          <span className="league-hero-logo league-card-logo--empty" />
        )}

        <div>
          <h1>{multiDivision ? info.divisionName : info.name}</h1>
          <p className="muted">
            {info.tournamentName}
            {multiDivision && hasSiblings && ` · ${info.name}`} ·{' '}
            {stageFormatLabels[info.formatType] ?? info.formatType} · очки {info.winPoints}/{info.drawPoints}/
            {info.lossPoints}
          </p>
        </div>
      </div>

      {hasSiblings && (
        <nav className="date-strip" aria-label="Этапы">
          {divisionStages.map((item) => (
            <Link
              key={item.id}
              to={`/stages/${item.id}`}
              className={item.id === info.id ? 'date-tab active' : 'date-tab'}
              aria-current={item.id === info.id ? 'page' : undefined}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      )}

      <div className={playoff ? 'stage-columns stage-columns--single' : 'stage-columns'}>
        <section>
          <div className="section-head">
            <h2>Матчи</h2>
            {selectedRound && (
              <span className="muted">
                {roundDates(selectedRound)} · {visibleRounds[0]?.matches.length ?? 0} из {matches?.length ?? 0}
              </span>
            )}
          </div>

          {rounds.length > 1 && (
            <RoundStrip rounds={rounds} selectedKey={roundKey} playoff={playoff} onSelect={(key) => setParam('round', key)} />
          )}

          {groups.length > 1 && (
            <div className="stage-filters" role="group" aria-label="Группа">
              {[{ groupId: ALL, name: 'Все группы' }, ...groups].map((item) => (
                <button
                  key={item.groupId}
                  type="button"
                  className={item.groupId === (group?.groupId ?? ALL) ? 'chip active' : 'chip'}
                  aria-pressed={item.groupId === (group?.groupId ?? ALL)}
                  onClick={() => setParam('group', item.groupId)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}

          {visibleRounds.length === 0 ? (
            <p className="notice">Матчей на этом этапе пока нет.</p>
          ) : (
            visibleRounds.map(({ round, matches: roundMatches }) => (
              <div key={round.key} className="competition competition--plain stage-round">
                {!selectedRound && (
                  <div className="stage-round-head">
                    <span>{roundTitle(round, playoff)}</span>
                    {!playoff && <span className="muted">{roundDates(round)}</span>}
                  </div>
                )}
                <div className="competition-body">
                  {roundMatches.map((match) => (
                    <FixtureRow key={match.id} match={match} showDate />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        {/* В плей-офф таблицы нет: только сетка (будет позже). */}
        {!playoff && (
          <section>
            <div className="section-head">
              <h2>Таблица</h2>
            </div>
            <div className="competition competition--plain">
              <StandingsTable rows={standings} groups={standingsGroups} />
            </div>
          </section>
        )}
      </div>
    </>
  )
}

type RoundStripProps = {
  rounds: Round[]
  selectedKey: string
  playoff: boolean
  onSelect: (key: string) => void
}

/** Полоса туров: «Все» и туры по порядку; выбранный тур держится в зоне видимости. */
function RoundStrip({ rounds, selectedKey, playoff, onSelect }: RoundStripProps) {
  const scrollerRef = useRef<HTMLElement>(null)

  // Центрируем выбранный тур без scrollIntoView, чтобы не дёргать вертикальную прокрутку страницы.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const active = scroller?.querySelector<HTMLElement>('.date-tab.active')
    if (!scroller || !active) return

    const offset = active.getBoundingClientRect().left - scroller.getBoundingClientRect().left
    scroller.scrollLeft += offset - (scroller.clientWidth - active.offsetWidth) / 2
  }, [selectedKey])

  return (
    <nav ref={scrollerRef} className="date-strip round-strip" aria-label="Туры">
      <button
        type="button"
        className={selectedKey === ALL ? 'date-tab active' : 'date-tab'}
        aria-pressed={selectedKey === ALL}
        onClick={() => onSelect(ALL)}
      >
        Все
      </button>

      {rounds.map((round) => (
        <button
          key={round.key}
          type="button"
          className={round.key === selectedKey ? 'date-tab round-tab active' : 'date-tab round-tab'}
          aria-pressed={round.key === selectedKey}
          onClick={() => onSelect(round.key)}
        >
          {playoff ? roundDates(round) : `${round.number} тур`}
          {!playoff && <span className="round-tab-dates">{roundDates(round)}</span>}
        </button>
      ))}
    </nav>
  )
}
