import React, { useState, useRef, useEffect } from 'react';
import {
  Star, Download, Share2, Eye, MoreVertical,
  Edit2, FolderInput, Trash2, RotateCcw, AlertOctagon,
  Loader
} from 'lucide-react';
import api from '../services/api';
import { getFileIcon } from '../utils/fileIcons';
import { formatFileSize, formatDate, isPreviewable } from '../utils/formatFileSize';

// Module-level thumbnail cache to preserve object URLs across re-renders & prevent memory churn
const thumbnailCache = new Map();

export default function FileCard({
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
  const [thumbnailUrl, setThumbnailUrl] = useState(() => thumbnailCache.get(file?.file_id) || null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const menuRef = useRef(null);

  const iconInfo = getFileIcon(file.file_name);
  const IconComponent = iconInfo.icon;
  const isStarred = file.is_starred === 'true' || file.is_starred === true;
  const mime = (file.mime_type || '').toLowerCase();
  const isImage = mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(file.file_name || '');
  const canPreview = isPreviewable(mime, file.file_name) || isImage;
  const fileExt = file.file_name && file.file_name.includes('.')
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

  // Robust thumbnail loader with cache & loading state
  useEffect(() => {
    let isMounted = true;
    if (!isImage || !file?.file_id) return;

    // Check module cache first
    if (thumbnailCache.has(file.file_id)) {
      setThumbnailUrl(thumbnailCache.get(file.file_id));
      setThumbnailLoading(false);
      setThumbnailError(false);
      return;
    }

    setThumbnailLoading(true);
    setThumbnailError(false);

    api
      .get(`/files/${file.file_id}/download?inline=true`, { responseType: 'blob' })
      .then((res) => {
        if (!isMounted) return;
        const objectUrl = URL.createObjectURL(res.data);
        thumbnailCache.set(file.file_id, objectUrl);
        setThumbnailUrl(objectUrl);
        setThumbnailLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        // Fallback: try direct backend URL
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
        const fallbackUrl = `${apiBase}/files/${file.file_id}/download?inline=true`;
        setThumbnailUrl(fallbackUrl);
        setThumbnailLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [file?.file_id, isImage]);

  const handleCardClick = (e) => {
    if (menuRef.current && menuRef.current.contains(e.target)) {
      return;
    }
    if (!isTrashView && canPreview && onPreview) {
      onPreview(file);
    }
  };

  const handleDragStart = (e) => {
    if (isTrashView) return;
    setIsDragging(true);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        file_id: file.file_id,
        file_name: file.file_name,
        folder_id: file.folder_id || '',
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`file-card ${menuOpen ? 'menu-active' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      title={file.file_name}
      draggable={!isTrashView}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="file-card-preview">
        {/* Loading Spinner / Shimmer for Images */}
        {isImage && thumbnailLoading && (
          <div className="file-card-loading-placeholder">
            <Loader size={20} className="spinner" style={{ color: 'var(--primary)' }} />
          </div>
        )}

        {/* Thumbnail Image */}
        {thumbnailUrl && !thumbnailError ? (
          <img
            src={thumbnailUrl}
            alt={file.file_name}
            loading="lazy"
            onError={() => {
              thumbnailCache.delete(file.file_id);
              setThumbnailError(true);
              setThumbnailUrl(null);
            }}
          />
        ) : null}

        {/* Fallback Icon */}
        <div
          className="file-card-icon"
          style={{
            backgroundColor: iconInfo.bg,
            color: iconInfo.color,
            display: thumbnailUrl && !thumbnailError ? 'none' : 'flex',
          }}
        >
          <IconComponent size={28} />
        </div>

        {/* Dedicated Preview Button for Image and Previewable Cards */}
        {!isTrashView && (isImage || canPreview) && onPreview && (
          <button
            className="file-card-quick-preview-btn"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(file);
            }}
            title="Preview"
          >
            <Eye size={14} />
            <span>Preview</span>
          </button>
        )}

        {/* Action Controls */}
        <div
          className={`file-card-actions ${menuOpen ? 'menu-open' : ''}`}
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
        >
          {!isTrashView ? (
            <>
              {onToggleStar && (
                <button
                  className={`file-card-action-btn ${isStarred ? 'star-active' : ''}`}
                  onClick={() => onToggleStar(file)}
                  title={isStarred ? 'Remove star' : 'Star file'}
                >
                  <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
                </button>
              )}

              {canPreview && onPreview && (
                <button
                  className="file-card-action-btn"
                  onClick={() => onPreview(file)}
                  title="Preview"
                >
                  <Eye size={16} />
                </button>
              )}

              {onDownload && (
                <button
                  className="file-card-action-btn"
                  onClick={() => onDownload(file)}
                  title="Download"
                >
                  <Download size={16} />
                </button>
              )}

              {onShare && (
                <button
                  className="file-card-action-btn"
                  onClick={() => onShare(file)}
                  title="Share"
                >
                  <Share2 size={16} />
                </button>
              )}

              <button
                className="file-card-action-btn"
                onClick={() => setMenuOpen((prev) => !prev)}
                title="More actions"
              >
                <MoreVertical size={16} />
              </button>

              {menuOpen && (
                <div
                  className="context-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
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
                      <Eye size={16} />
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
                      <Download size={16} />
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
                      <Share2 size={16} />
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
                      <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
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
                      <Edit2 size={16} />
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
                      <FolderInput size={16} />
                      <span>Move to...</span>
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
                        <Trash2 size={16} />
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
                  className="file-card-action-btn"
                  onClick={() => onRestore(file)}
                  title="Restore file"
                >
                  <RotateCcw size={16} />
                </button>
              )}
              {onPermanentDelete && (
                <button
                  className="file-card-action-btn"
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

      <div className="file-card-info">
        <div className="file-card-name" title={file.file_name}>
          {file.file_name}
        </div>
        <div className="file-card-meta">
          <span className="file-card-ext-badge">{fileExt}</span>
          <span>•</span>
          <span>{formatFileSize(file.file_size)}</span>
          {file.created_at && (
            <>
              <span>•</span>
              <span>{formatDate(file.created_at)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
