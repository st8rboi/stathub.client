import { Link, NavLink, Route, Routes } from 'react-router'
import HomePage from '@/pages/HomePage'
import LeaguePage from '@/pages/LeaguePage'
import LeaguesPage from '@/pages/LeaguesPage'
import MatchPage from '@/pages/MatchPage'
import StagePage from '@/pages/StagePage'
import StatisticsPage from '@/pages/StatisticsPage'

export default function App() {
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            ⚡
          </span>
          STATHUB
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
    </>
  )
}
