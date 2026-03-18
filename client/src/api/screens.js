import api from './axios';

export const getScreens = () => api.get('/screens').then(r => r.data);
export const getScreen = (id) => api.get(`/screens/${id}`).then(r => r.data);
export const createScreen = (data) => api.post('/screens', data).then(r => r.data);
export const updateScreen = (id, data) => api.put(`/screens/${id}`, data).then(r => r.data);
export const deleteScreen = (id) => api.delete(`/screens/${id}`).then(r => r.data);
