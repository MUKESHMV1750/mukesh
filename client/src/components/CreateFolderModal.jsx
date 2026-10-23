import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

export default function CreateFolderModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onCreate(name.trim());
      setName('');
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="stat-icon-wrap icon-blue" style={{ width: 34, height: 34 }}>
                <FolderPlus size={18} />
              </div>
              <h2>New Folder</h2>
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
            <div className="input-group">
              <label htmlFor="folder-name-input">Folder Name</label>
              <input
                id="folder-name-input"
                className="input-field"
                type="text"
                placeholder="Untitled folder"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
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
              disabled={!name.trim() || submitting}
            >
              <FolderPlus size={16} />
              <span>{submitting ? 'Creating...' : 'Create'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
