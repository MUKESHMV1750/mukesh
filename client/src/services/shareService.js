import api from './api';

export const shareService = {
  createShare: (fileId, expiresInHours = 24) =>
    api.post(`/files/${fileId}/share`, { expires_in_hours: expiresInHours }),

  getFileShares: (fileId) => api.get(`/files/${fileId}/shares`),

  revokeShare: (shareId) => api.delete(`/shares/${shareId}`),
};

export default shareService;
