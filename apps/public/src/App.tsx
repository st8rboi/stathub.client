import { Link, NavLink, Route, Routes } from 'react-router'
import BrandMark from '@/components/BrandMark'
import HomePage from '@/pages/HomePage'
import LeaguePage from '@/pages/LeaguePage'
import LeaguesPage from '@/pages/LeaguesPage'
import MatchPage from '@/pages/MatchPage'
import StagePage from '@/pages/StagePage'
import StatisticsPage from '@/pages/StatisticsPage'
import TeamPage from '@/pages/TeamPage'

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export default function App() {
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Статхаб — на главную">
          <BrandMark className="brand-mark" />
          <span className="brand-name">Статхаб</span>
        </Link>

        <nav className="topnav">
          <NavLink to="/" end>
            Матчи
          </NavLink>
          <NavLink to="/leagues">Лиги</NavLink>
          <NavLink to="/statistics">Статистика</NavLink>
        </nav>

        <span className="topbar-note">Любительский футбол</span>
      </header>

      <main className="page">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/leagues/:slug" element={<LeaguePage />} />
          <Route path="/stages/:stageId" element={<StagePage />} />
          <Route path="/matches/:matchId" element={<MatchPage />} />
          <Route path="/teams/:teamId" element={<TeamPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route
            path="*"
            element={
              <p className="notice">
                Страница не найдена. <Link to="/">На главную</Link>
              </p>
            }
          />
        </Routes>
      </main>

      <nav className="tabbar" aria-label="Основная навигация">
        <NavLink to="/" end>
          <svg {...svgProps}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          Матчи
        </NavLink>
        <NavLink to="/leagues">
          <svg {...svgProps}>
            <path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" />
            <path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 14v4M8 20h8" />
          </svg>
          Лиги
        </NavLink>
        <NavLink to="/statistics">
          <svg {...svgProps}>
            <path d="M5 20v-7M12 20V5M19 20v-11" />
          </svg>
          Статистика
        </NavLink>
      </nav>
    </>
  )
}
