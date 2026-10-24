import api from './api';

export const fileService = {
  listFiles: (params = {}) => api.get('/files', { params }),

  getRecentFiles: () => api.get('/files/recent'),

  uploadFiles: (formData, onProgress) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),

  reuploadFile: (id, formData, onProgress) =>
    api.post(`/files/${id}/reupload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),

  previewFile: (id) => api.get(`/files/${id}/preview`),

  downloadFile: (id) =>
    api.get(`/files/${id}/download`, { responseType: 'blob' }),

  renameFile: (id, name) => api.patch(`/files/${id}/rename`, { name }),

  moveFile: (id, folderId) =>
    api.patch(`/files/${id}/move`, { folder_id: folderId }),

  toggleStar: (id) => api.patch(`/files/${id}/star`),

  trashFile: (id) => api.delete(`/files/${id}`),

  restoreFile: (id) => api.patch(`/files/${id}/restore`),

  permanentDelete: (id) => api.delete(`/files/${id}/permanent`),

  emptyTrash: () => api.delete('/files/trash/empty'),

  getStorageUsage: () => api.get('/storage/usage'),
};

export default fileService;
