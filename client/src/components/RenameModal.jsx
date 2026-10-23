import React, { useState, useEffect } from 'react';
import { X, Edit2, AlertCircle, Check, FileType } from 'lucide-react';

export default function RenameModal({ item, isOpen, onClose, onRename, existingItems = [] }) {
  const [baseName, setBaseName] = useState('');
  const [extension, setExtension] = useState('');
  const [allowEditExt, setAllowEditExt] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isFolder = !!item?.folder_name;
  const originalFullName = item ? (item.file_name || item.folder_name || '') : '';

  useEffect(() => {
    if (!item || !isOpen) return;

    if (isFolder) {
      setBaseName(originalFullName);
      setExtension('');
      setAllowEditExt(false);
    } else {
      const lastDot = originalFullName.lastIndexOf('.');
      if (lastDot > 0) {
        setBaseName(originalFullName.substring(0, lastDot));
        setExtension(originalFullName.substring(lastDot + 1));
      } else {
        setBaseName(originalFullName);
        setExtension('');
      }
      setAllowEditExt(false);
    }
    setValidationError('');
  }, [item, isOpen, isFolder, originalFullName]);

  // Real-time validation
  useEffect(() => {
    if (!isOpen) return;

    const trimmedBase = baseName.trim();
    if (!trimmedBase) {
      setValidationError('Name cannot be empty.');
      return;
    }

    // Invalid characters: / \ : * ? " < > |
    if (/[<>:"/\\|?*\x00-\x1F]/.test(trimmedBase) || (allowEditExt && /[<>:"/\\|?*\x00-\x1F]/.test(extension))) {
      setValidationError('Name contains invalid characters: / \\ : * ? " < > |');
      return;
    }

    const cleanExt = extension.trim().replace(/^\./, '');
    const candidateName = isFolder
      ? trimmedBase
      : (cleanExt ? `${trimmedBase}.${cleanExt}` : trimmedBase);

    // Duplicate check in current folder items
    if (existingItems && existingItems.length > 0) {
      const isDuplicate = existingItems.some((other) => {
        const otherId = other.file_id || other.folder_id;
        const currentId = item.file_id || item.folder_id;
        if (otherId === currentId) return false;
        const otherName = (other.file_name || other.folder_name || '').toLowerCase();
        return otherName === candidateName.toLowerCase();
      });

      if (isDuplicate) {
        setValidationError(`An item named "${candidateName}" already exists here.`);
        return;
      }
    }

    setValidationError('');
  }, [baseName, extension, allowEditExt, isFolder, existingItems, item, isOpen]);

  if (!isOpen || !item) return null;

  const cleanExt = extension.trim().replace(/^\./, '');
  const candidateName = isFolder
    ? baseName.trim()
    : (cleanExt ? `${baseName.trim()}.${cleanExt}` : baseName.trim());

  const isUnchanged = candidateName === originalFullName;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validationError || isUnchanged || !baseName.trim()) return;

    setSubmitting(true);
    try {
      await onRename(item, candidateName);
      onClose();
    } catch (err) {
      setValidationError(err.response?.data?.message || err.message || 'Failed to rename item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="stat-icon-wrap icon-blue" style={{ width: 34, height: 34 }}>
                <Edit2 size={18} />
              </div>
              <h2 style={{ fontSize: '1.125rem' }}>Rename {isFolder ? 'Folder' : 'File'}</h2>
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
              <label htmlFor="rename-input" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{isFolder ? 'Folder Name' : 'File Name'}</span>
                {!isFolder && extension && (
                  <button
                    type="button"
                    onClick={() => setAllowEditExt(!allowEditExt)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                      textDecoration: 'underline'
                    }}
                  >
                    {allowEditExt ? 'Lock extension' : 'Change extension'}
                  </button>
                )}
              </label>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  id="rename-input"
                  className="input-field"
                  type="text"
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value)}
                  placeholder="Enter name"
                  autoFocus
                  required
                  style={{ flex: 1 }}
                />

                {!isFolder && extension && !allowEditExt && (
                  <div
                    title={`Protected extension: .${extension}`}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--bg-tertiary)',
                      border: '2px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      userSelect: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    .{extension}
                  </div>
                )}

                {!isFolder && allowEditExt && (
                  <input
                    type="text"
                    value={extension}
                    onChange={(e) => setExtension(e.target.value)}
                    placeholder="ext"
                    className="input-field"
                    style={{ width: '80px', fontWeight: 600 }}
                    title="File extension"
                  />
                )}
              </div>
            </div>

            {/* Live Result Preview */}
            {!isFolder && candidateName && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  wordBreak: 'break-all'
                }}
              >
                <span>Result:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{candidateName}</strong>
              </div>
            )}

            {/* Validation Error Banner */}
            {validationError && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--red-light)',
                  color: 'var(--red)',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{validationError}</span>
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
              disabled={!!validationError || isUnchanged || !baseName.trim() || submitting}
            >
              {submitting ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
