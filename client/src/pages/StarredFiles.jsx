import React, { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, List, Star, Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import FileCard from '../components/FileCard';
import FileListItem from '../components/FileListItem';
import FilePreviewModal from '../components/FilePreviewModal';
import ShareModal from '../components/ShareModal';
import RenameModal from '../components/RenameModal';
import MoveModal from '../components/MoveModal';
import ConfirmDialog from '../components/ConfirmDialog';
import BottomNav from '../components/BottomNav';
import fileService from '../services/fileService';
import { useToast } from '../context/ToastContext';

export default function StarredFiles() {
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Modals
  const [renameTarget, setRenameTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadStarred = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fileService.listFiles({ is_starred: 'true', status: 'active' });
      if (res.data?.success) {
        setFiles(res.data.data || []);
      }
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || 'Failed to load starred files');
      showToast('Failed to load starred files', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadStarred();
  }, [loadStarred]);

  const handleToggleStar = async (file) => {
    try {
      await fileService.toggleStar(file.file_id);
      setFiles((prev) => prev.filter((f) => f.file_id !== file.file_id));
      showToast('Removed from Starred', 'info');
    } catch {
      showToast('Error updating star', 'error');
    }
  };

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

  const handleRename = async (file, newName) => {
    try {
      await fileService.renameFile(file.file_id, newName);
      showToast('File renamed', 'success');
      loadStarred();
    } catch {
      showToast('Rename failed', 'error');
    }
  };

  const handleMove = async (file, targetFolderId) => {
    try {
      await fileService.moveFile(file.file_id, targetFolderId);
      showToast('File moved', 'success');
      loadStarred();
    } catch {
      showToast('Move failed', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await fileService.trashFile(deleteTarget.file_id);
      showToast('Moved to trash', 'success');
      setDeleteTarget(null);
      loadStarred();
    } catch {
      showToast('Delete failed', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const [filterType, setFilterType] = useState('all');

  const displayedFiles = files.filter((f) => {
    if (searchQuery) {
      if (!f.file_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    if (filterType !== 'all') {
      const mime = (f.mime_type || '').toLowerCase();
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

  return (
    <div className="dashboard-layout">
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        <div className="page-header">
          <div className="page-header-info">
            <div className="page-title-row">
              <div className="stat-icon-wrap icon-yellow" style={{ width: 34, height: 34 }}>
                <Star size={18} fill="#f59e0b" />
              </div>
              <h1 className="page-title">Starred Files</h1>
              <span className="page-title-badge" style={{ background: '#fef3c7', color: '#d97706', borderColor: '#fde68a' }}>
                {displayedFiles.length} Starred
              </span>
            </div>
            <p className="page-subtitle">
              Quick access to your pinned and favorited files across DriveX
            </p>
          </div>

          <div className="page-actions">
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
          </div>
        </div>

        {/* Quick Category Filter Bar */}
        <div className="filter-bar">
          <button
            type="button"
            className={`filter-chip ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            <LayoutGrid size={15} />
            <span>All Starred</span>
            <span className="filter-count">{files.length}</span>
          </button>
          <button
            type="button"
            className={`filter-chip ${filterType === 'documents' ? 'active' : ''}`}
            onClick={() => setFilterType('documents')}
          >
            <span className="chip-icon-blue">•</span>
            <span>Documents</span>
          </button>
          <button
            type="button"
            className={`filter-chip ${filterType === 'images' ? 'active' : ''}`}
            onClick={() => setFilterType('images')}
          >
            <span className="chip-icon-green">•</span>
            <span>Photos</span>
          </button>
          <button
            type="button"
            className={`filter-chip ${filterType === 'videos' ? 'active' : ''}`}
            onClick={() => setFilterType('videos')}
          >
            <span className="chip-icon-red">•</span>
            <span>Videos</span>
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
            <p>Loading starred files...</p>
          </div>
        ) : loadError ? (
          <div className="empty-state error-state">
            <AlertCircle size={44} />
            <h3>Unable to load starred files</h3>
            <p>{loadError}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={loadStarred}
              style={{ marginTop: 8 }}
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </div>
        ) : displayedFiles.length === 0 ? (
          <div className="empty-state">
            <Star size={48} color="var(--text-tertiary)" />
            <h3>No starred files</h3>
            <p>Add stars to files you want to easily find later.</p>
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
      </main>

      <RenameModal
        item={renameTarget}
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        onRename={handleRename}
        existingItems={files}
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
          onFileUpdated={(updated) => {
            setFiles((prev) =>
              prev.map((f) => (f.file_id === updated.file_id ? { ...f, ...updated } : f))
            );
            setPreviewTarget(updated);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Move to Trash"
        message={`Move "${deleteTarget?.file_name}" to trash?`}
        confirmText="Move to Trash"
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
