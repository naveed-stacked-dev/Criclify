import apiClient from "./apiClient";

const documentService = {
  getByClub: (clubId, params = {}) => apiClient.get(`/documents/${clubId}`, { params }),
  create: (data) => apiClient.post("/documents", data, { headers: { "Content-Type": "multipart/form-data" } }),
  remove: (id) => apiClient.delete(`/documents/${id}`),
};

export default documentService;
