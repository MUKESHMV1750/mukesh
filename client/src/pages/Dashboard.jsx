import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, List, ArrowDownAZ, ArrowUpAZ,
  Calendar, Database, FolderPlus, UploadCloud,
  Inbox, Folder, AlertCircle, RefreshCw,
  FileText, Image as ImageIcon, Film, Music, Archive
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Breadcrumb from '../components/Breadcrumb';
import FolderCard from '../components/FolderCard';
import FileCard from '../components/FileCard';
import FileListItem from '../components/FileListItem';
import UploadZone from '../components/UploadZone';
import UploadProgress from '../components/UploadProgress';
import FilePreviewModal from '../components/FilePreviewModal';
import ShareModal from '../components/ShareModal';
import CreateFolderModal from '../components/CreateFolderModal';
import RenameModal from '../components/RenameModal';
import MoveModal from '../components/MoveModal';
import ConfirmDialog from '../components/ConfirmDialog';
import BottomNav from '../components/BottomNav';
import fileService from '../services/fileService';
import folderService from '../services/folderService';
import { useToast } from '../context/ToastContext';

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentFolderId = searchParams.get('folder') || '';

  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  // Layout & Navigation State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('created_desc'); // name_asc, name_desc, date_desc, size_desc
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Data State
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);

  // Uploads State
  const [uploads, setUploads] = useState([]);

  // Modals State
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load content
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setLoadError(null);
    try {
      const [foldersRes, filesRes, storageRes] = await Promise.all([
        folderService.listFolders(currentFolderId),
        fileService.listFiles({ folder_id: currentFolderId, status: 'active' }),
        fileService.getStorageUsage().catch(() => ({ data: { success: false } })),
      ]);

      if (foldersRes.data?.success) {
        setFolders(foldersRes.data.data || []);
      }
      if (filesRes.data?.success) {
        setFiles(filesRes.data.data || []);
      }
      if (storageRes.data?.success) {
        setStorageInfo(storageRes.data.data);
      }
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || 'Unable to connect to drive storage service');
      showToast('Failed to load drive items', 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [currentFolderId, showToast]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Navigate folder
  const handleOpenFolder = (folder) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.folder_id, name: folder.folder_name }]);
    setSearchParams({ folder: folder.folder_id });
  };

  const handleBreadcrumbNavigate = (folderId) => {
    if (!folderId) {
      setBreadcrumbs([]);
      setSearchParams({});
    } else {
      const idx = breadcrumbs.findIndex((b) => b.id === folderId);
      if (idx !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
        setSearchParams({ folder: folderId });
      }
    }
  };

  // Upload handler
  const handleUploadFiles = async (filesList) => {
    if (!filesList || filesList.length === 0) return;

    const newUploads = filesList.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      file,
      progress: 0,
      status: 'uploading',
    }));

    setUploads((prev) => [...newUploads, ...prev]);

    for (const item of newUploads) {
      const formData = new FormData();
      formData.append('files', item.file);
      if (currentFolderId) {
        formData.append('folder_id', currentFolderId);
      }

      try {
        const uploadRes = await fileService.uploadFiles(formData, (progressEvent) => {
          const total = progressEvent.total || item.file.size;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          setUploads((prev) =>
            prev.map((u) => (u.id === item.id ? { ...u, progress: percent } : u))
          );
        });

        setUploads((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, progress: 100, status: 'complete' } : u))
        );

        // DIRECTLY show uploaded files in the UI immediately without any manual reload!
        if (uploadRes.data?.success && uploadRes.data?.data) {
          const createdFiles = Array.isArray(uploadRes.data.data)
            ? uploadRes.data.data
            : [uploadRes.data.data];
          setFiles((prev) => {
            const existingIds = new Set(prev.map((f) => f.file_id));
            const fresh = createdFiles.filter((f) => !existingIds.has(f.file_id));
            return [...fresh, ...prev];
          });
        }

        showToast(`Uploaded "${item.name}"`, 'success');
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, status: 'error' } : u))
        );
        showToast(`Failed to upload "${item.name}"`, 'error');
      }
    }

    // Refresh data in background without showing full-page spinner
    loadData(false);
  };

  // Star toggle
  const handleToggleStar = async (file) => {
    try {
      const res = await fileService.toggleStar(file.file_id);
      if (res.data?.success) {
        const updated = res.data.data;
        setFiles((prev) =>
          prev.map((f) => (f.file_id === file.file_id ? { ...f, is_starred: updated.is_starred } : f))
        );
        showToast(
          updated.is_starred === 'true' || updated.is_starred === true
            ? 'Added to Starred'
            : 'Removed from Starred',
          'info'
        );
      }
    } catch {
      showToast('Error updating star', 'error');
    }
  };

  // Download
  const handleDownload = async (file) => {
    try {
      showToast(`Starting download: ${file.file_name}`, 'info');
      const res = await fileService.downloadFile(file.file_id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('Download failed', 'error');
    }
  };

  // Folder creation
  const handleCreateFolder = async (name) => {
    try {
      const res = await folderService.createFolder(name, currentFolderId);
      if (res.data?.success) {
        showToast(`Created folder "${name}"`, 'success');
        if (res.data.data) {
          setFolders((prev) => [...prev, res.data.data]);
        }
        loadData(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create folder', 'error');
      throw err;
    }
  };

  // Rename
  const handleRename = async (target, newName) => {
    try {
      if (target.folder_name) {
        await folderService.renameFolder(target.folder_id, newName);
      } else {
        await fileService.renameFile(target.file_id, newName);
      }
      showToast('Renamed successfully', 'success');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to rename', 'error');
      throw err;
    }
  };

  // Move
  const handleMove = async (file, targetFolderId) => {
    try {
      await fileService.moveFile(file.file_id, targetFolderId);
      showToast(`Moved "${file.file_name}"`, 'success');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to move file', 'error');
      throw err;
    }
  };

  // Drag-and-drop file moving into folder
  const handleDropMoveFile = async (droppedFile, targetFolderId, targetFolderName) => {
    if (!droppedFile?.file_id || !targetFolderId) return;
    try {
      await fileService.moveFile(droppedFile.file_id, targetFolderId);
      showToast(`Moved "${droppedFile.file_name}" into "${targetFolderName || 'folder'}"`, 'success');
      loadData(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to move file', 'error');
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteTarget.folder_name) {
        await folderService.deleteFolder(deleteTarget.folder_id);
        showToast(`Folder "${deleteTarget.folder_name}" deleted`, 'success');
      } else {
        await fileService.trashFile(deleteTarget.file_id);
        showToast(`Moved "${deleteTarget.file_name}" to trash`, 'success');
      }
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter & Search
  let displayedFiles = files.filter((f) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_name.toLowerCase().includes(q)) return false;
    }
    if (filterType !== 'all') {
      const mime = f.mime_type || '';
      if (filterType === 'documents') {
        if (!mime.includes('pdf') && !mime.includes('document') && !mime.includes('text') && !mime.includes('sheet') && !mime.includes('presentation')) return false;
      } else if (filterType === 'images') {
        if (!mime.startsWith('image/')) return false;
      } else if (filterType === 'videos') {
        if (!mime.startsWith('video/')) return false;
      } else if (filterType === 'audio') {
        if (!mime.startsWith('audio/')) return false;
      } else if (filterType === 'archives') {
        if (!mime.includes('zip') && !mime.includes('tar') && !mime.includes('rar') && !mime.includes('7z')) return false;
      }
    }
    return true;
  });

  let displayedFolders = folders.filter((f) => {
    if (searchQuery) {
      return f.folder_name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Calculate category counts for filter chips

  const docCount = files.filter((f) => {
    const m = (f.mime_type || '').toLowerCase();
    return m.includes('pdf') || m.includes('document') || m.includes('text') || m.includes('sheet') || m.includes('presentation');
  }).length;
  const imgCount = files.filter((f) => (f.mime_type || '').startsWith('image/')).length;
  const vidCount = files.filter((f) => (f.mime_type || '').startsWith('video/')).length;
  const audCount = files.filter((f) => (f.mime_type || '').startsWith('audio/')).length;
  const archCount = files.filter((f) => {
    const m = (f.mime_type || '').toLowerCase();
    return m.includes('zip') || m.includes('tar') || m.includes('rar') || m.includes('7z');
  }).length;

  // Sorting
  displayedFiles.sort((a, b) => {
    if (sortBy === 'name_asc') return a.file_name.localeCompare(b.file_name);
    if (sortBy === 'name_desc') return b.file_name.localeCompare(a.file_name);
    if (sortBy === 'size_desc') return Number(b.file_size || 0) - Number(a.file_size || 0);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return (
    <div className="dashboard-layout">
      {/* Hidden file selector */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) handleUploadFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />

      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onUploadClick={() => fileInputRef.current?.click()}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCreateFolder={() => setCreateFolderOpen(true)}
        onUploadClick={() => fileInputRef.current?.click()}
        storageInfo={storageInfo}
      />

      <main className="main-content">
        {/* Modern Admin Page Header */}
        <div className="page-header">
          <div className="page-header-info">
            <Breadcrumb
              items={breadcrumbs}
              onNavigate={handleBreadcrumbNavigate}
              onDropFile={handleDropMoveFile}
            />
            <div className="page-title-row">
              <h1 className="page-title">
                {breadcrumbs.length > 0
                  ? breadcrumbs[breadcrumbs.length - 1].name
                  : 'My Drive'}
              </h1>
              {!currentFolderId && (
                <span className="page-title-badge">Admin Dashboard</span>
              )}
            </div>
            <p className="page-subtitle">
              {breadcrumbs.length > 0
                ? `Directory view • ${displayedFolders.length} folders, ${displayedFiles.length} files`
                : 'Cloud File Manager & Sharing System • Secure • Fast • Easy • All Files in One Place'}
            </p>
          </div>

          <div className="page-actions">
            <button
              className="btn btn-secondary new-folder-btn"
              onClick={() => setCreateFolderOpen(true)}
              title="Create new folder"
            >
              <FolderPlus size={16} />
              <span>New Folder</span>
            </button>

            <button
              className="btn btn-primary upload-action-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Upload files to Drive"
            >
              <UploadCloud size={16} />
              <span>Upload</span>
            </button>

            {/* View Mode Toggle */}
            <div className="view-toggle" role="group" aria-label="View layout toggle">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
                aria-label="List view"
              >
                <List size={18} />
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="sort-dropdown" style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary sort-trigger-btn"
                onClick={() => setSortMenuOpen(!sortMenuOpen)}
                title="Sort options"
              >
                {sortBy === 'name_asc' ? <ArrowDownAZ size={16} /> : <Calendar size={16} />}
                <span className="sort-btn-label">Sort</span>
              </button>

              {sortMenuOpen && (
                <div className="sort-menu">
                  <button
                    className={`sort-option ${sortBy === 'created_desc' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('created_desc');
                      setSortMenuOpen(false);
                    }}
                  >
                    <Calendar size={16} />
                    <span>Last Modified</span>
                  </button>
                  <button
                    className={`sort-option ${sortBy === 'name_asc' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('name_asc');
                      setSortMenuOpen(false);
                    }}
                  >
                    <ArrowDownAZ size={16} />
                    <span>Name (A to Z)</span>
                  </button>
                  <button
                    className={`sort-option ${sortBy === 'name_desc' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('name_desc');
                      setSortMenuOpen(false);
                    }}
                  >
                    <ArrowUpAZ size={16} />
                    <span>Name (Z to A)</span>
                  </button>
                  <button
                    className={`sort-option ${sortBy === 'size_desc' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('size_desc');
                      setSortMenuOpen(false);
                    }}
                  >
                    <Database size={16} />
                    <span>File Size</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Drag & Drop Upload Zone */}
        <div className="dashboard-upload-zone-wrap">
          <UploadZone onFilesSelected={handleUploadFiles} />
        </div>

        {/* Quick Category Filter Bar */}
        <div className="filter-bar">
          <button
            type="button"
            className={`filter-chip ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            <LayoutGrid size={15} />
            <span>All Files</span>
            <span className="filter-count">{files.length}</span>
          </button>
          <button
            type="button"
            className={`filter-chip ${filterType === 'documents' ? 'active' : ''}`}
            onClick={() => setFilterType('documents')}
          >
            <FileText size={15} className="chip-icon-blue" />
            <span>Documents</span>
            <span className="filter-count">{docCount}</span>
          </button>
          <button
            type="button"
            className={`filter-chip ${filterType === 'images' ? 'active' : ''}`}
            onClick={() => setFilterType('images')}
          >
            <ImageIcon size={15} className="chip-icon-green" />
            <span>Photos</span>
            <span className="filter-count">{imgCount}</span>
          </button>
          <button
            type="button"
            className={`filter-chip ${filterType === 'videos' ? 'active' : ''}`}
            onClick={() => setFilterType('videos')}
          >
            <Film size={15} className="chip-icon-red" />
            <span>Videos</span>
            <span className="filter-count">{vidCount}</span>
          </button>
          <button
            type="button"
            className={`filter-chip ${filterType === 'audio' ? 'active' : ''}`}
            onClick={() => setFilterType('audio')}
          >
            <Music size={15} className="chip-icon-yellow" />
            <span>Audio</span>
            <span className="filter-count">{audCount}</span>
          </button>
          <button
            type="button"
            className={`filter-chip ${filterType === 'archives' ? 'active' : ''}`}
            onClick={() => setFilterType('archives')}
          >
            <Archive size={15} className="chip-icon-indigo" />
            <span>Archives</span>
            <span className="filter-count">{archCount}</span>
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
            <p>Loading files and folders...</p>
          </div>
        ) : loadError ? (
          <div className="empty-state error-state">
            <AlertCircle size={44} />
            <h3>Unable to load drive items</h3>
            <p>{loadError}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => loadData(true)}
              style={{ marginTop: 8 }}
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <>
            {/* Folders Section */}
            {displayedFolders.length > 0 && (
              <section className="folder-section">
                <div className="section-title">
                  Folders ({displayedFolders.length})
                </div>
                <div className="folder-grid">
                  {displayedFolders.map((folder) => (
                    <FolderCard
                      key={folder.folder_id}
                      folder={folder}
                      onOpen={handleOpenFolder}
                      onRename={(f) => setRenameTarget(f)}
                      onDelete={(f) => setDeleteTarget(f)}
                      onDropFile={handleDropMoveFile}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Files Section */}
            <section>
              <div className="section-title">
                Files ({displayedFiles.length})
              </div>

              {displayedFiles.length === 0 ? (
                <div className="empty-state">
                  <Inbox size={48} />
                  <h3>No files in this folder</h3>
                  <p>Drop files here or click "Upload" in the navbar to add files.</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="file-grid">
                  {displayedFiles.map((file) => (
                    <FileCard
                      key={file.file_id}
                      file={file}
                      onPreview={(f) => setPreviewTarget(f)}
                      onDownload={handleDownload}
                      onShare={(f) => setShareTarget(f)}
                      onToggleStar={handleToggleStar}
                      onRename={(f) => setRenameTarget(f)}
                      onMove={(f) => setMoveTarget(f)}
                      onTrash={(f) => setDeleteTarget(f)}
                    />
                  ))}
                </div>
              ) : (
                <div className="file-list">
                  <div className="file-list-header">
                    <span>Name</span>
                    <span>Date Modified</span>
                    <span>File Size</span>
                    <span>Type</span>
                    <span>Actions</span>
                  </div>
                  {displayedFiles.map((file) => (
                    <FileListItem
                      key={file.file_id}
                      file={file}
                      onPreview={(f) => setPreviewTarget(f)}
                      onDownload={handleDownload}
                      onShare={(f) => setShareTarget(f)}
                      onToggleStar={handleToggleStar}
                      onRename={(f) => setRenameTarget(f)}
                      onMove={(f) => setMoveTarget(f)}
                      onTrash={(f) => setDeleteTarget(f)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Floating Upload Progress */}
      <UploadProgress
        uploads={uploads}
        onClose={() => setUploads([])}
      />

      {/* Modals */}
      <CreateFolderModal
        isOpen={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onCreate={handleCreateFolder}
      />

      <RenameModal
        item={renameTarget}
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        onRename={handleRename}
        existingItems={[...folders, ...files]}
      />

      <MoveModal
        file={moveTarget}
        isOpen={!!moveTarget}
        onClose={() => setMoveTarget(null)}
        onMove={handleMove}
      />

      {shareTarget && (
        <ShareModal
          file={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}

      {previewTarget && (
        <FilePreviewModal
          file={previewTarget}
          onClose={() => setPreviewTarget(null)}
          onDownload={handleDownload}
          onShare={(f) => {
            setPreviewTarget(null);
            setShareTarget(f);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={deleteTarget?.folder_name ? 'Delete Folder' : 'Move to Trash'}
        message={
          deleteTarget?.folder_name
            ? `Are you sure you want to delete folder "${deleteTarget.folder_name}"?`
            : `Move "${deleteTarget?.file_name}" to trash? You can restore it later.`
        }
        confirmText={deleteTarget?.folder_name ? 'Delete' : 'Move to Trash'}
        confirmVariant="btn-danger"
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
