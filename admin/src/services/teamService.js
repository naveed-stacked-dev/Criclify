import apiClient from "./apiClient";

const teamService = {
  create: (data) => apiClient.post("/teams", data),
  getByClub: (clubId, params) => apiClient.get(`/teams/club/${clubId}`, { params }),
  getById: (id) => apiClient.get(`/teams/${id}`),
  update: (id, data) => apiClient.put(`/teams/${id}`, data),
  remove: (id) => apiClient.delete(`/teams/${id}`),
  addPlayer: (teamId, data) => apiClient.post(`/teams/${teamId}/add-player`, data),
  getPlayers: (teamId) => apiClient.get(`/teams/${teamId}/players`),
  approve: (id) => apiClient.put(`/teams/${id}/approve`),
};

export default teamService;
