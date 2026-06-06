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
  getMatchById: (matchId) =>
    apiClient.get(`/public/matches/${matchId}`),
  getMatchSummary: (matchId) =>
    apiClient.get(`/public/matches/${matchId}/summary`),
  getMatchScorecard: (matchId) =>
    apiClient.get(`/public/matches/${matchId}/scorecard`),
  getMatchEvents: (matchId) =>
    apiClient.get(`/public/matches/${matchId}/events`),

  // ─── Teams & Players ───
  getTeamsByClub: (clubId, params) =>
    apiClient.get(`/public/teams/club/${clubId}`, { params }),
  getTeam: (id) => apiClient.get(`/public/teams/${id}`),
  submitTeam: (data) => apiClient.post('/teams/submit-public', data),
  getPlayersByClub: (clubId, params) =>
    apiClient.get(`/public/players/club/${clubId}`, { params }),
  getPlayer: (id) => apiClient.get(`/public/players/${id}`),

  // ─── Content ───
  getSponsors: (clubId) => apiClient.get(`/content/${clubId}/sponsors`),
  getPosts: (clubId, params) => apiClient.get(`/content/${clubId}/posts`, { params }),
  getGallery: (clubId, params) => apiClient.get(`/content/${clubId}/gallery`, { params }),
};

export default clubService;
