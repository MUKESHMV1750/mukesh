import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutGrid, List, Trash2, RotateCcw, AlertOctagon, Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import FileCard from '../components/FileCard';
import FileListItem from '../components/FileListItem';
import ConfirmDialog from '../components/ConfirmDialog';
import BottomNav from '../components/BottomNav';
import fileService from '../services/fileService';
import { useToast } from '../context/ToastContext';

export default function TrashPage() {
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState(() => {
    try {
      const cached = sessionStorage.getItem('drivex_cache_trash');
      return cached ? JSON.parse(cached) : [];
    } catch (e) { return []; }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem('drivex_cache_trash');
    } catch (e) { return true; }
  });
  const [loadError, setLoadError] = useState(null);

  // Dialogs
  const [actionTarget, setActionTarget] = useState(null); // { type: 'restore' | 'delete' | 'empty', file }
  const [actionLoading, setActionLoading] = useState(false);

  const filesLenRef = useRef(files.length);
  useEffect(() => {
    filesLenRef.current = files.length;
  }, [files.length]);

  const loadTrash = useCallback(async () => {
    if (filesLenRef.current === 0) setLoading(true);
    setLoadError(null);
    const timeout = setTimeout(() => setLoading(false), 15000);
    try {
      const res = await fileService.listFiles({ status: 'trashed', is_trashed: 'true', trashed: 'true' });
      if (res.data?.success) {
        const data = res.data.data || [];
        setFiles(data);
        try { sessionStorage.setItem('drivex_cache_trash', JSON.stringify(data)); } catch (e) {}
      }
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || 'Failed to load trash items');
      if (filesLenRef.current === 0) showToast('Failed to load trash items', 'error');
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const handleRestore = async (file) => {
    try {
      await fileService.restoreFile(file.file_id);
      showToast(`Restored "${file.file_name}"`, 'success');
      setFiles((prev) => prev.filter((f) => f.file_id !== file.file_id));
    } catch {
      showToast('Restore failed', 'error');
    }
  };

  const handlePermanentDelete = (file) => {
    setActionTarget({ type: 'delete', file });
  };

  const handleEmptyTrash = () => {
    setActionTarget({ type: 'empty' });
  };

  const handleConfirmAction = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    try {
      if (actionTarget.type === 'delete') {
        await fileService.permanentDelete(actionTarget.file.file_id);
        showToast(`Permanently deleted "${actionTarget.file.file_name}"`, 'success');
        setFiles((prev) => prev.filter((f) => f.file_id !== actionTarget.file.file_id));
      } else if (actionTarget.type === 'empty') {
        try {
          await fileService.emptyTrash();
        } catch {
          for (const file of files) {
            await fileService.permanentDelete(file.file_id).catch(() => {});
          }
        }
        showToast('Trash emptied', 'success');
        setFiles([]);
      }
      setActionTarget(null);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const displayedFiles = files.filter((f) => {
    if (f.is_trashed === false) return false;
    if (searchQuery) {
      return f.file_name.toLowerCase().includes(searchQuery.toLowerCase());
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
              <div className="stat-icon-wrap icon-red" style={{ width: 34, height: 34 }}>
                <Trash2 size={18} />
              </div>
              <h1 className="page-title">Trash Bin</h1>
              <span className="page-title-badge" style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}>
                {displayedFiles.length} Trashed
              </span>
            </div>
            <p className="page-subtitle">
              Items in trash can be restored anytime or permanently purged from Google Drive
            </p>
          </div>

          <div className="page-actions">
            {files.length > 0 && (
              <button
                className="btn btn-danger"
                onClick={handleEmptyTrash}
                title="Permanently remove all items in trash"
              >
                <AlertOctagon size={16} />
                <span>Empty Trash</span>
              </button>
            )}

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

        {loading && displayedFiles.length === 0 ? (
          <div className="dashboard-skeleton-wrap">
            <div className="skeleton-files-grid">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="skeleton-file-item" />
              ))}
            </div>
          </div>
        ) : loadError && displayedFiles.length === 0 ? (
          <div className="empty-state error-state">
            <AlertCircle size={44} />
            <h3>Unable to load trash</h3>
            <p>{loadError}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={loadTrash}
              style={{ marginTop: 8 }}
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </div>
        ) : displayedFiles.length === 0 ? (
          <div className="empty-state">
            <Inbox size={48} />
            <h3>Trash is empty</h3>
            <p>Items you move to trash will show up here.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="file-grid">
            {displayedFiles.map((file) => (
              <FileCard
                key={file.file_id}
                file={file}
                isTrashView
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
              />
            ))}
          </div>
        ) : (
          <div className="file-list">
            <div className="file-list-header">
              <span>Name</span>
              <span>Date Trashed</span>
              <span>File Size</span>
              <span>Type</span>
              <span>Actions</span>
            </div>
            {displayedFiles.map((file) => (
              <FileListItem
                key={file.file_id}
                file={file}
                isTrashView
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
              />
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        isOpen={!!actionTarget}
        title={actionTarget?.type === 'empty' ? 'Empty Trash?' : 'Delete Permanently?'}
        message={
          actionTarget?.type === 'empty'
            ? 'Are you sure you want to permanently delete all items in trash? This cannot be undone.'
            : `Are you sure you want to permanently delete "${actionTarget?.file?.file_name}" from Google Drive? This cannot be undone.`
        }
        confirmText={actionTarget?.type === 'empty' ? 'Empty Trash' : 'Delete Permanently'}
        confirmVariant="btn-danger"
        loading={actionLoading}
        onClose={() => setActionTarget(null)}
        onConfirm={handleConfirmAction}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
