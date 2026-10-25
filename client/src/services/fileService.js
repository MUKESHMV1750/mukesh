import api, { transferTimeoutMs, MAX_UPLOAD_BYTES } from './api';

export const fileService = {
  listFiles: (params = {}) => api.get('/files', { params, timeout: 45000 }),

  getRecentFiles: () => api.get('/files/recent', { timeout: 45000 }),

  uploadFiles: (formData, onProgress, totalBytes = 0) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
      timeout: transferTimeoutMs(totalBytes || MAX_UPLOAD_BYTES),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }),

  reuploadFile: (id, formData, onProgress, totalBytes = 0) =>
    api.post(`/files/${id}/reupload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
      timeout: transferTimeoutMs(totalBytes || MAX_UPLOAD_BYTES),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }),

  previewFile: (id) => api.get(`/files/${id}/preview`, { timeout: 30000 }),

  downloadFile: (id, sizeBytes = 0) =>
    api.get(`/files/${id}/download`, {
      responseType: 'blob',
      timeout: transferTimeoutMs(sizeBytes || MAX_UPLOAD_BYTES),
    }),

  renameFile: (id, name) => api.patch(`/files/${id}/rename`, { name }),

  moveFile: (id, folderId) =>
    api.patch(`/files/${id}/move`, { folder_id: folderId }),

  toggleStar: (id) => api.patch(`/files/${id}/star`),

  trashFile: (id) => api.delete(`/files/${id}`),

  restoreFile: (id) => api.patch(`/files/${id}/restore`),

  permanentDelete: (id) => api.delete(`/files/${id}/permanent`),

  emptyTrash: () => api.delete('/files/trash/empty', { timeout: 120000 }),

  getStorageUsage: () => api.get('/storage/usage', { timeout: 30000 }),
};

export default fileService;
