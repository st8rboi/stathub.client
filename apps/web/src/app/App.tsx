import { BrowserRouter, Link, Route, Routes } from 'react-router'
import LeaguePage from '@/features/leagues/pages/LeaguePage'
import LeaguesPage from '@/features/leagues/pages/LeaguesPage'
import StagePage from '@/features/matches/pages/StagePage'
import PlayersPage from '@/features/players/pages/PlayersPage'
import TournamentTeamPage from '@/features/rosters/pages/TournamentTeamPage'
import TeamsPage from '@/features/teams/pages/TeamsPage'
import TournamentPage from '@/features/tournaments/pages/TournamentPage'
import { Header } from './Header'
import { Providers } from './providers'

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<LeaguesPage />} />
            <Route path="/leagues/:leagueId" element={<LeaguePage />} />
            <Route path="/leagues/:leagueId/tournaments/:tournamentId" element={<TournamentPage />} />
            <Route
              path="/leagues/:leagueId/tournaments/:tournamentId/stages/:stageId"
              element={<StagePage />}
            />
            <Route
              path="/leagues/:leagueId/tournaments/:tournamentId/teams/:tournamentTeamId"
              element={<TournamentTeamPage />}
            />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route
              path="*"
              element={
                <p>
                  Страница не найдена. <Link to="/">На главную</Link>
                </p>
              }
            />
          </Routes>
        </main>
      </BrowserRouter>
    </Providers>
  )
}
