import { Routes, Route, Navigate } from "react-router-dom";
import { useAppContext } from "@/hooks/useAppContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";

// Pages
import LoginPage from "@/pages/LoginPage";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import ClubManagerDashboard from "@/pages/ClubManagerDashboard";
import ClubsPage from "@/pages/ClubsPage";
import TeamsPage from "@/pages/TeamsPage";
import PlayersPage from "@/pages/PlayersPage";
import PlayerProfilePage from "@/pages/PlayerProfilePage";
import TournamentsPage from "@/pages/TournamentsPage";
import MatchesPage from "@/pages/MatchesPage";
import MatchSummaryPage from "@/pages/MatchSummaryPage";
import MatchSchedulingPage from "@/pages/MatchSchedulingPage";
import LiveScoringPage from "@/pages/LiveScoringPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ClubDetailsPage from "@/pages/ClubDetailsPage";
import ClubSettingsPage from "@/pages/ClubSettingsPage";
import ProfilePage from "@/pages/ProfilePage";
import SponsorsPage from "@/pages/SponsorsPage";
import GalleryPage from "@/pages/GalleryPage";
import PostsPage from "@/pages/PostsPage";

const ALL_ADMIN_ROLES = ["superAdmin", "superadmin", "clubManager", "club_manager", "matchManager", "match_manager"];
const MANAGER_ROLES = ["superAdmin", "superadmin", "clubManager", "club_manager"];
const SCORER_ROLES = ["superAdmin", "superadmin", "clubManager", "club_manager", "matchManager", "match_manager"];

/**
 * Role-based dashboard switcher — renders the appropriate dashboard
 * based on the authenticated user's role.
 */
function RoleDashboard() {
  const { isSuperAdmin, user } = useAppContext();
  
  if (user?.role === "matchManager" || user?.role === "match-manager") {
    return <Navigate to="/scoring" replace />;
  }

  return isSuperAdmin ? <SuperAdminDashboard /> : <ClubManagerDashboard />;
}

export default function App() {
  const { isAuthenticated } = useAppContext();

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Protected Admin Layout */}
      <Route
        element={
          <ProtectedRoute allowedRoles={ALL_ADMIN_ROLES}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* Role-based dashboard */}
        <Route index element={<RoleDashboard />} />

        {/* SuperAdmin-only: Clubs management */}
        <Route path="clubs" element={
          <ProtectedRoute allowedRoles={["superAdmin", "superadmin"]}><ClubsPage /></ProtectedRoute>
        } />
        <Route path="clubs/:clubId" element={
          <ProtectedRoute allowedRoles={["superAdmin", "superadmin"]}><ClubDetailsPage /></ProtectedRoute>
        } />

        {/* ClubManager + SuperAdmin */}
        <Route path="tournaments" element={
          <ProtectedRoute allowedRoles={MANAGER_ROLES}><TournamentsPage /></ProtectedRoute>
        } />
        <Route path="teams" element={
          <ProtectedRoute allowedRoles={MANAGER_ROLES}><TeamsPage /></ProtectedRoute>
        } />
        <Route path="players" element={
          <ProtectedRoute allowedRoles={MANAGER_ROLES}><PlayersPage /></ProtectedRoute>
        } />
        <Route path="players/:playerId" element={
          <ProtectedRoute allowedRoles={MANAGER_ROLES}><PlayerProfilePage /></ProtectedRoute>
        } />
        <Route path="matches" element={
          <ProtectedRoute allowedRoles={MANAGER_ROLES}><MatchesPage /></ProtectedRoute>
        } />
        <Route path="match/:matchId/match-summary" element={
          <ProtectedRoute allowedRoles={MANAGER_ROLES}><MatchSummaryPage /></ProtectedRoute>
        } />
        <Route path="match-scheduling" element={
          <ProtectedRoute allowedRoles={MANAGER_ROLES}><MatchSchedulingPage /></ProtectedRoute>
        } />
        <Route path="analytics" element={
          <ProtectedRoute allowedRoles={MANAGER_ROLES}><AnalyticsPage /></ProtectedRoute>
        } />

        {/* Scoring */}
        <Route path="scoring/:matchId" element={
          <ProtectedRoute allowedRoles={SCORER_ROLES}><LiveScoringPage /></ProtectedRoute>
        } />
        <Route path="scoring" element={
          <ProtectedRoute allowedRoles={SCORER_ROLES}><LiveScoringPage /></ProtectedRoute>
        } />

        {/* Content Management */}
        <Route path="sponsors" element={
          <ProtectedRoute allowedRoles={MANAGER_ROLES}><SponsorsPage /></ProtectedRoute>
        } />
        <Route path="gallery" element={
          <ProtectedRoute allowedRoles={MANAGER_ROLES}><GalleryPage /></ProtectedRoute>
        } />
        <Route path="posts" element={
          <ProtectedRoute allowedRoles={MANAGER_ROLES}><PostsPage /></ProtectedRoute>
        } />

        {/* Club Settings (ClubManager) */}
        <Route path="club-settings" element={
          <ProtectedRoute allowedRoles={["clubManager"]}><ClubSettingsPage /></ProtectedRoute>
        } />
        
        {/* Profile */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
