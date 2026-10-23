import api from './api';

export const folderService = {
  listFolders: (parentId) =>
    api.get('/folders', { params: parentId !== undefined ? { parent_id: parentId } : {} }),

  createFolder: (name, parentFolderId) =>
    api.post('/folders', { name, parent_folder_id: parentFolderId || '' }),

  renameFolder: (id, name) => api.patch(`/folders/${id}`, { name }),

  deleteFolder: (id) => api.delete(`/folders/${id}`),
};

export default folderService;
