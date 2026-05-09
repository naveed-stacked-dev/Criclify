import apiClient from "./apiClient";

const contentService = {
  // Sponsors
  getSponsors: (clubId) => apiClient.get(`/content/${clubId}/sponsors`),
  createSponsor: (data) => apiClient.post("/content/sponsors", data, { headers: { "Content-Type": "multipart/form-data" } }),
  updateSponsor: (id, data) => apiClient.put(`/content/sponsors/${id}`, data, { headers: { "Content-Type": "multipart/form-data" } }),
  deleteSponsor: (id) => apiClient.delete(`/content/sponsors/${id}`),

  // Posts
  getPosts: (clubId) => apiClient.get(`/content/${clubId}/posts`),
  createPost: (data) => apiClient.post("/content/posts", data, { headers: { "Content-Type": "multipart/form-data" } }),
  updatePost: (id, data) => apiClient.put(`/content/posts/${id}`, data, { headers: { "Content-Type": "multipart/form-data" } }),
  deletePost: (id) => apiClient.delete(`/content/posts/${id}`),

  // Gallery
  getGallery: (clubId, params = {}) => apiClient.get(`/content/${clubId}/gallery`, { params }),
  createGalleryImage: (data) => apiClient.post("/content/gallery", data, { headers: { "Content-Type": "multipart/form-data" } }),
  deleteGalleryImage: (id) => apiClient.delete(`/content/gallery/${id}`),
};

export default contentService;
