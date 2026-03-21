import api from './axios';

export const screensApi = {
  list: () => api.get('/screens').then(r => r.data),
  get: (id) => api.get(`/screens/${id}`).then(r => r.data),
  create: (data) => api.post('/screens', data).then(r => r.data),
  update: (id, data) => api.put(`/screens/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/screens/${id}`).then(r => r.data),
  publish: (id) => api.post(`/screens/${id}/publish`).then(r => r.data),
  unpublish: (id) => api.post(`/screens/${id}/unpublish`).then(r => r.data),

  listContent: (screenId) => api.get(`/screens/${screenId}/content`).then(r => r.data),
  addContent: (screenId, data) => {
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v);
    });
    return api.post(`/screens/${screenId}/content`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  updateContent: (screenId, contentId, data) =>
    api.put(`/screens/${screenId}/content/${contentId}`, data).then(r => r.data),
  removeContent: (screenId, contentId) =>
    api.delete(`/screens/${screenId}/content/${contentId}`).then(r => r.data),
  reorderContent: (screenId, items) =>
    api.put(`/screens/${screenId}/content/reorder`, { items }).then(r => r.data),
};

// Public player — no auth
export const getPlayerData = (slug) =>
  api.get(`/play/${slug}`).then(r => r.data);
export const getPlayerDataByCode = (code) =>
  api.get(`/play/code/${code}`).then(r => r.data);
