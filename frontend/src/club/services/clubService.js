import apiClient from "@/services/apiClient";

const clubService = {
  // ─── Club ───
  getClubs: (params) => apiClient.get("/public/clubs", { params }),
  getClubBySlug: (slug) => apiClient.get(`/public/club/slug/${slug}`),

  // ─── Tournaments ───
  getTournaments: (clubId, params) =>
    apiClient.get(`/public/tournaments/club/${clubId}`, { params }),
  getTournament: (id) => apiClient.get(`/public/tournaments/${id}`),
  getPointsTable: (id) => apiClient.get(`/public/tournaments/${id}/points-table`),
  getBracket: (id) => apiClient.get(`/public/tournaments/${id}/bracket`),

  // ─── Matches ───
  getMatchesByClub: (clubId, params) =>
    apiClient.get(`/public/matches/club/${clubId}`, { params }),
  getMatchesByTournament: (tournamentId, params) =>
    apiClient.get(`/public/matches/tournament/${tournamentId}`, { params }),
  getRecentMatches: (clubId, limit = 10) =>
    apiClient.get(`/public/matches/recent/${clubId}`, { params: { limit } }),
  getLiveMatches: (clubId) =>
    apiClient.get(`/public/live-matches/${clubId}`),
  getMatchSummary: (matchId) =>
    apiClient.get(`/public/match/${matchId}/summary`),
  getMatchScorecard: (matchId) =>
    apiClient.get(`/public/match/${matchId}/scorecard`),

  // ─── Teams & Players ───
  getTeamsByClub: (clubId, params) =>
    apiClient.get(`/public/teams/club/${clubId}`, { params }),
  getPlayersByClub: (clubId, params) =>
    apiClient.get(`/public/players/club/${clubId}`, { params }),
  getPlayer: (id) => apiClient.get(`/public/players/${id}`),

  // ─── Content ───
  getSponsors: (clubId) => apiClient.get(`/content/${clubId}/sponsors`),
  getPosts: (clubId, params) => apiClient.get(`/content/${clubId}/posts`, { params }),
  getGallery: (clubId, params) => apiClient.get(`/content/${clubId}/gallery`, { params }),
};

export default clubService;
