import apiClient from "./apiClient";

const scoringService = {
  startMatch: (id, data) => apiClient.post(`/scoring/${id}/start`, data),
  resumeMatch: (id) => apiClient.post(`/scoring/${id}/resume`),
  pauseMatch: (id, data) => apiClient.post(`/scoring/${id}/pause`, data),
  addScore: (id, data) => apiClient.post(`/scoring/${id}/score`, data),
  addWicket: (id, data) => apiClient.post(`/scoring/${id}/wicket`, data),
  addExtra: (id, data) => apiClient.post(`/scoring/${id}/extra`, data),
  endMatch: (id, data) => apiClient.post(`/scoring/${id}/end`, data),
  undoLastEvent: (id) => apiClient.post(`/scoring/${id}/undo`),
  switchInnings: (id) => apiClient.post(`/scoring/${id}/switch-innings`),
  saveSuperOver: (id, data) => apiClient.post(`/scoring/${id}/super-over`, data),
  setActivePlayers: (id, data) => apiClient.post(`/scoring/${id}/set-players`, data),
  addSubstitute: (id, data) => apiClient.post(`/scoring/${id}/substitute`, data),

  // Public read
  getSummary: (id) => apiClient.get(`/scoring/${id}/summary`),
  getScorecard: (id) => apiClient.get(`/scoring/${id}/scorecard`),
  getEvents: (id) => apiClient.get(`/scoring/${id}/events`),
  getAuditLogs: (id) => apiClient.get(`/scoring/${id}/audit-logs`),
};

export default scoringService;
