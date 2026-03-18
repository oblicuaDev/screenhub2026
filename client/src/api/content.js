import api from './axios';

export const getContent = (screenId) => api.get(`/screens/${screenId}/content`).then(r => r.data);

export const createContent = (screenId, formData) =>
  api.post(`/screens/${screenId}/content`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const updateContent = (screenId, id, data) =>
  api.put(`/screens/${screenId}/content/${id}`, data).then(r => r.data);

export const deleteContent = (screenId, id) =>
  api.delete(`/screens/${screenId}/content/${id}`).then(r => r.data);

export const reorderContent = (screenId, items) =>
  api.put(`/screens/${screenId}/content/reorder`, { items }).then(r => r.data);

export const getPlayerData = (screenId) =>
  api.get(`/screens/${screenId}/content/player`).then(r => r.data);
