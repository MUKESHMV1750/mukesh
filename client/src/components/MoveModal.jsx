import React, { useState, useEffect } from 'react';
import { X, Folder, HardDrive, FolderInput } from 'lucide-react';
import folderService from '../services/folderService';

export default function MoveModal({ file, isOpen, onClose, onMove }) {
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFolders();
      setSelectedFolderId('');
    }
  }, [isOpen]);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const res = await folderService.listFolders();
      if (res.data?.success) {
        setFolders(res.data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !file) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onMove(file, selectedFolderId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, marginRight: 10 }}>
              <div className="stat-icon-wrap icon-blue" style={{ width: 34, height: 34, flexShrink: 0 }}>
                <FolderInput size={18} />
              </div>
              <h2 style={{ fontSize: '1.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Move "{file.file_name}"
              </h2>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Select the destination folder:
            </p>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
                <div className="skeleton-file-item" style={{ height: 42, width: '100%' }} />
                <div className="skeleton-file-item" style={{ height: 42, width: '100%' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                <div
                  className={`folder-card ${selectedFolderId === '' ? 'active' : ''}`}
                  onClick={() => setSelectedFolderId('')}
                  style={{
                    cursor: 'pointer',
                    background: selectedFolderId === '' ? 'var(--bg-active)' : 'var(--bg-tertiary)',
                    borderColor: selectedFolderId === '' ? 'var(--primary)' : 'var(--border-light)',
                  }}
                >
                  <HardDrive size={18} color="var(--primary)" />
                  <span className="folder-card-name" style={{ fontWeight: 600 }}>My Drive (Root)</span>
                </div>

                {folders.map((f) => {
                  const isCurrent = f.folder_id === file.folder_id;
                  const isSelected = selectedFolderId === f.folder_id;
                  return (
                    <div
                      key={f.folder_id}
                      className="folder-card"
                      onClick={() => !isCurrent && setSelectedFolderId(f.folder_id)}
                      style={{
                        cursor: isCurrent ? 'not-allowed' : 'pointer',
                        opacity: isCurrent ? 0.5 : 1,
                        background: isSelected ? 'var(--bg-active)' : 'var(--bg-secondary)',
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border-light)',
                      }}
                    >
                      <Folder size={18} color={isSelected ? 'var(--primary)' : 'var(--text-secondary)'} />
                      <span className="folder-card-name">{f.folder_name}</span>
                      {isCurrent && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>(Current)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || (selectedFolderId === file.folder_id)}
            >
              <FolderInput size={16} />
              <span>{submitting ? 'Moving...' : 'Move Here'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
