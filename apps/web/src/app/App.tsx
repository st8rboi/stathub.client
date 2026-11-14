import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router'
import LoginPage from '@/features/auth/LoginPage'
import AdminsPage from '@/features/accounts/pages/AdminsPage'
import RefereesPage from '@/features/accounts/pages/RefereesPage'
import StatisticiansPage from '@/features/accounts/pages/StatisticiansPage'
import LeagueLayout from '@/features/leagues/pages/LeagueLayout'
import LeagueSettingsPage from '@/features/leagues/pages/LeagueSettingsPage'
import LeagueTournamentsPage from '@/features/leagues/pages/LeagueTournamentsPage'
import LeaguesPage from '@/features/leagues/pages/LeaguesPage'
import StageMatchesPage from '@/features/matches/pages/StageMatchesPage'
import PlayersPage from '@/features/players/pages/PlayersPage'
import StatMatchesPage from '@/features/statistician/pages/StatMatchesPage'
import StatPanelPage from '@/features/statistician/pages/StatPanelPage'
import { StatisticianShell } from '@/features/statistician/StatisticianShell'
import TournamentTeamPage from '@/features/rosters/pages/TournamentTeamPage'
import TeamsPage from '@/features/teams/pages/TeamsPage'
import StageFeesPage from '@/features/tournaments/pages/StageFeesPage'
import StageLayout from '@/features/tournaments/pages/StageLayout'
import StageSettingsPage from '@/features/tournaments/pages/StageSettingsPage'
import StageTeamsPage from '@/features/tournaments/pages/StageTeamsPage'
import TournamentDisciplinePage from '@/features/tournaments/pages/TournamentDisciplinePage'
import TournamentFeesPage from '@/features/tournaments/pages/TournamentFeesPage'
import TournamentLayout from '@/features/tournaments/pages/TournamentLayout'
import TournamentSettingsPage from '@/features/tournaments/pages/TournamentSettingsPage'
import TournamentStagesPage from '@/features/tournaments/pages/TournamentStagesPage'
import { EmptyState } from '@/shared/ui/layout'
import { Providers } from './providers'
import { RequireAuth, RequireStaff } from './RequireAuth'
import { AppShell } from './shell/AppShell'

/**
 * Дерево роутов повторяет иерархию соревнования: лига → турнир → этап → команда.
 * У лиги, турнира и этапа есть layout (шапка + вкладки); состав команды — отдельная страница.
 */
export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Рабочее место статистика: свой каркас без меню админки, только назначенные матчи. */}
          <Route
            path="stats"
            element={
              <RequireAuth>
                <StatisticianShell />
              </RequireAuth>
            }
          >
            <Route index element={<StatMatchesPage />} />
            <Route path=":matchId" element={<StatPanelPage />} />
          </Route>

          <Route
            element={
              <RequireAuth>
                <RequireStaff>
                  <AppShell />
                </RequireStaff>
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
                  <Route element={<StageLayout />}>
                    <Route index element={<StageMatchesPage />} />
                    <Route path="teams" element={<StageTeamsPage />} />
                    <Route path="fees" element={<StageFeesPage />} />
                    <Route path="settings" element={<StageSettingsPage />} />
                  </Route>
                  <Route path="teams/:tournamentTeamId" element={<TournamentTeamPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="teams" element={<TeamsPage />} />
            <Route path="players" element={<PlayersPage />} />
            <Route path="referees" element={<RefereesPage />} />
            <Route path="statisticians" element={<StatisticiansPage />} />
            <Route path="admins" element={<AdminsPage />} />
            {/* Старый адрес раздела «Судьи». */}
            <Route path="accounts" element={<Navigate to="/referees" replace />} />

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
