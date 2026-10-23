import React, { useState, useRef, useEffect } from 'react';
import {
  Star, Download, Share2, Eye, MoreVertical,
  Edit2, FolderInput, Trash2, RotateCcw, AlertOctagon
} from 'lucide-react';
import { getFileIcon } from '../utils/fileIcons';
import { formatFileSize, formatDate, isPreviewable } from '../utils/formatFileSize';

export default function FileListItem({
  file,
  onPreview,
  onDownload,
  onShare,
  onToggleStar,
  onRename,
  onMove,
  onTrash,
  onRestore,
  onPermanentDelete,
  isTrashView = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const iconInfo = getFileIcon(file.file_name);
  const IconComponent = iconInfo.icon;
  const isStarred = file.is_starred === 'true' || file.is_starred === true;
  const canPreview = isPreviewable(file.mime_type || '', file.file_name || '');
  const ext = file.file_name && file.file_name.includes('.')
    ? file.file_name.split('.').pop().toUpperCase()
    : 'FILE';

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleRowClick = (e) => {
    if (menuRef.current && menuRef.current.contains(e.target)) {
      return;
    }
    if (!isTrashView && onPreview) {
      onPreview(file);
    }
  };

  return (
    <div
      className={`file-list-row ${menuOpen ? 'menu-active' : ''}`}
      onClick={handleRowClick}
      role="row"
      tabIndex={0}
    >
      <div className="file-list-name">
        <div
          className="file-list-icon-badge"
          style={{
            color: iconInfo.color,
            backgroundColor: iconInfo.bg,
          }}
        >
          <IconComponent size={18} />
        </div>
        <div className="file-list-name-col">
          <span className="file-list-name-text" title={file.file_name}>
            {file.file_name}
          </span>
          <span className="file-list-mobile-meta">
            {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
          </span>
        </div>
      </div>

      <div className="file-list-cell text-muted">{formatDate(file.created_at)}</div>
      <div className="file-list-cell font-medium">{formatFileSize(file.file_size)}</div>
      <div className="file-list-cell">
        <span
          className="file-list-ext-pill"
          style={{
            color: iconInfo.color,
            backgroundColor: iconInfo.bg,
            border: `1px solid ${iconInfo.color}30`,
          }}
        >
          {ext}
        </span>
      </div>

      <div
        className={`file-list-actions ${menuOpen ? 'menu-open' : ''}`}
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative' }}
      >
        {!isTrashView ? (
          <>
            {onToggleStar && (
              <button
                className="list-action-btn"
                style={{
                  color: isStarred ? 'var(--yellow)' : 'var(--text-tertiary)',
                }}
                onClick={() => onToggleStar(file)}
                title={isStarred ? 'Unstar' : 'Star'}
              >
                <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
              </button>
            )}

            {canPreview && onPreview && (
              <button
                className="list-action-btn"
                onClick={() => onPreview(file)}
                title="Preview"
              >
                <Eye size={16} />
              </button>
            )}

            {onDownload && (
              <button
                className="list-action-btn"
                onClick={() => onDownload(file)}
                title="Download"
              >
                <Download size={16} />
              </button>
            )}

            {onShare && (
              <button
                className="list-action-btn"
                onClick={() => onShare(file)}
                title="Share"
              >
                <Share2 size={16} />
              </button>
            )}

            <button
              className="list-action-btn"
              onClick={() => setMenuOpen((prev) => !prev)}
              title="More"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div
                className="context-menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 100,
                }}
              >
                {onPreview && (
                  <button
                    type="button"
                    className="context-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onPreview(file);
                    }}
                  >
                    <Eye size={15} />
                    <span>View / Preview</span>
                  </button>
                )}
                {onDownload && (
                  <button
                    type="button"
                    className="context-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onDownload(file);
                    }}
                  >
                    <Download size={15} />
                    <span>Download</span>
                  </button>
                )}
                {onShare && (
                  <button
                    type="button"
                    className="context-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onShare(file);
                    }}
                  >
                    <Share2 size={15} />
                    <span>Share</span>
                  </button>
                )}
                {onToggleStar && (
                  <button
                    type="button"
                    className="context-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleStar(file);
                    }}
                  >
                    <Star size={15} fill={isStarred ? 'currentColor' : 'none'} />
                    <span>{isStarred ? 'Unstar' : 'Star'}</span>
                  </button>
                )}
                <div className="context-menu-divider" />
                {onRename && (
                  <button
                    type="button"
                    className="context-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onRename(file);
                    }}
                  >
                    <Edit2 size={15} />
                    <span>Rename</span>
                  </button>
                )}
                {onMove && (
                  <button
                    type="button"
                    className="context-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onMove(file);
                    }}
                  >
                    <FolderInput size={15} />
                    <span>Move</span>
                  </button>
                )}
                {onTrash && (
                  <>
                    <div className="context-menu-divider" />
                    <button
                      type="button"
                      className="context-menu-item danger"
                      onClick={() => {
                        setMenuOpen(false);
                        onTrash(file);
                      }}
                    >
                      <Trash2 size={15} />
                      <span>Move to trash</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {onRestore && (
              <button
                className="list-action-btn"
                onClick={() => onRestore(file)}
                title="Restore file"
              >
                <RotateCcw size={16} />
              </button>
            )}
            {onPermanentDelete && (
              <button
                className="list-action-btn"
                style={{ color: 'var(--red)' }}
                onClick={() => onPermanentDelete(file)}
                title="Delete permanently"
              >
                <AlertOctagon size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
