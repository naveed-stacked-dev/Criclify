import { Routes, Route } from "react-router-dom";
import { ReactLenis } from "lenis/react";

import Navbar from "./Home/components/Navbar";
import Footer from "./Home/components/Footer";
import { ProtectedRoute, PublicRoute } from "./components/RouteGuards";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ClubsPage from "./pages/ClubsPage";
import TournamentCenterPage from "./pages/TournamentCenterPage";
import MatchCenterPage from "./pages/MatchCenterPage";
import PlayerProfilePage from "./pages/PlayerProfilePage";
import UserDashboardPage from "./pages/UserDashboardPage";

// Club Portal (nested layout)
import ClubLayout from "./club/layouts/ClubLayout";
import ClubHomePage from "./club/pages/ClubHomePage";
import ClubTournamentsPage from "./club/pages/ClubTournamentsPage";
import ClubMatchesPage from "./club/pages/ClubMatchesPage";
import ClubTeamsPage from "./club/pages/ClubTeamsPage";
import ClubPlayersPage from "./club/pages/ClubPlayersPage";
import ClubPostsPage from "./club/pages/ClubPostsPage";
import ClubGalleryPage from "./club/pages/ClubGalleryPage";
import ClubMatchDetailPage from "./club/pages/ClubMatchDetailPage";
import ClubPlayerProfilePage from "./club/pages/ClubPlayerProfilePage";
import ClubTeamDetailPage from "./club/pages/ClubTeamDetailPage";

export default function App() {
  return (
    <ReactLenis root>
      <Routes>
        {/* ─── Main site with global Navbar & Footer ─── */}
        <Route
          element={
            <div className="relative bg-[#0a0a0c] text-white min-h-screen overflow-x-hidden flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/clubs" element={<ClubsPage />} />
                  <Route path="/tournaments/:id" element={<TournamentCenterPage />} />
                  <Route path="/matches/:id" element={<MatchCenterPage />} />
                  <Route path="/players/:id" element={<PlayerProfilePage />} />

                  <Route element={<PublicRoute />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                  </Route>

                  <Route element={<ProtectedRoute />}>
                    <Route path="/profile" element={<UserDashboardPage />} />
                  </Route>
                </Routes>
              </main>
              <Footer />
            </div>
          }
        >
          <Route path="/*" element={null} />
        </Route>

        {/* ─── Club Portal (own layout, no global Navbar/Footer) ─── */}
        <Route path="/clubs/:slug" element={<ClubLayout />}>
          <Route index element={<ClubHomePage />} />
          <Route path="tournaments" element={<ClubTournamentsPage />} />
          <Route path="matches" element={<ClubMatchesPage />} />
          <Route path="teams" element={<ClubTeamsPage />} />
          <Route path="players" element={<ClubPlayersPage />} />
          <Route path="posts" element={<ClubPostsPage />} />
          <Route path="gallery" element={<ClubGalleryPage />} />
          <Route path="matches/:matchId" element={<ClubMatchDetailPage />} />
          <Route path="players/:playerId" element={<ClubPlayerProfilePage />} />
          <Route path="teams/:teamId" element={<ClubTeamDetailPage />} />
        </Route>
      </Routes>
    </ReactLenis>
  );
}
