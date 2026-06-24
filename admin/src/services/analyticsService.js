import apiClient from "./apiClient";

const analyticsService = {
  getPlayerAnalytics: (id) => apiClient.get(`/analytics/player/${id}`),
  getPlayerForm: (id) => apiClient.get(`/analytics/player/${id}/form`),
  getMatchAnalytics: (id) => apiClient.get(`/analytics/match/${id}`),
  getMatchGraph: (id) => apiClient.get(`/analytics/match/${id}/graph`),
  getTeamAnalytics: (id) => apiClient.get(`/analytics/team/${id}`),
  getHeadToHead: (id, opponentId) => apiClient.get(`/analytics/team/${id}/head-to-head/${opponentId}`),
  getLeaderboard: (clubId, params) => apiClient.get(`/analytics/leaderboard/${clubId}`, { params }),
  getClubDashboardStats: (clubId, params) => apiClient.get(`/analytics/dashboard/${clubId}`, { params }),
};

export default analyticsService;
