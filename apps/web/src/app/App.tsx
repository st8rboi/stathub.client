import { BrowserRouter, Link, Route, Routes } from 'react-router'
import LoginPage from '@/features/auth/LoginPage'
import AccountsPage from '@/features/accounts/pages/AccountsPage'
import LeagueLayout from '@/features/leagues/pages/LeagueLayout'
import LeagueSettingsPage from '@/features/leagues/pages/LeagueSettingsPage'
import LeagueTournamentsPage from '@/features/leagues/pages/LeagueTournamentsPage'
import LeaguesPage from '@/features/leagues/pages/LeaguesPage'
import StagePage from '@/features/matches/pages/StagePage'
import PlayersPage from '@/features/players/pages/PlayersPage'
import TournamentTeamPage from '@/features/rosters/pages/TournamentTeamPage'
import TeamsPage from '@/features/teams/pages/TeamsPage'
import TournamentDisciplinePage from '@/features/tournaments/pages/TournamentDisciplinePage'
import TournamentFeesPage from '@/features/tournaments/pages/TournamentFeesPage'
import TournamentLayout from '@/features/tournaments/pages/TournamentLayout'
import TournamentSettingsPage from '@/features/tournaments/pages/TournamentSettingsPage'
import TournamentStagesPage from '@/features/tournaments/pages/TournamentStagesPage'
import { EmptyState } from '@/shared/ui/layout'
import { Providers } from './providers'
import { RequireAuth } from './RequireAuth'
import { AppShell } from './shell/AppShell'

/**
 * Дерево роутов повторяет иерархию соревнования: лига → турнир → этап → команда.
 * У лиги и турнира есть layout (шапка + вкладки); этап получит такой же на следующем этапе.
 */
export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<LeaguesPage />} />

            <Route path="leagues/:leagueId">
              <Route element={<LeagueLayout />}>
                <Route index element={<LeagueTournamentsPage />} />
                <Route path="settings" element={<LeagueSettingsPage />} />
              </Route>
              <Route path="tournaments/:tournamentId">
                <Route element={<TournamentLayout />}>
                  <Route index element={<TournamentStagesPage />} />
                  <Route path="fees" element={<TournamentFeesPage />} />
                  <Route path="discipline" element={<TournamentDisciplinePage />} />
                  <Route path="settings" element={<TournamentSettingsPage />} />
                </Route>
                <Route path="stages/:stageId">
                  <Route index element={<StagePage />} />
                  <Route path="teams/:tournamentTeamId" element={<TournamentTeamPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="teams" element={<TeamsPage />} />
            <Route path="players" element={<PlayersPage />} />
            <Route path="accounts" element={<AccountsPage />} />

            <Route
              path="*"
              element={
                <EmptyState title="Страница не найдена" action={<Link to="/">К списку лиг</Link>}>
                  Возможно, ссылка устарела или раздел был удалён.
                </EmptyState>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </Providers>
  )
}
