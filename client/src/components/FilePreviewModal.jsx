import React, { useEffect, useState, useRef } from 'react';
import {
  X, Download, Share2, FileQuestion, ZoomIn, ZoomOut, RotateCcw, AlertCircle
} from 'lucide-react';
import api from '../services/api';
import fileService from '../services/fileService';

export default function FilePreviewModal({
  file,
  onClose,
  onDownload,
  onShare,
}) {
  const [previewData, setPreviewData] = useState(null);
  const [metadataLoading, setMetadataLoading] = useState(true);

  // Image zoom, pan, and blob states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const imageContainerRef = useRef(null);

  const mime = file?.mime_type || '';
  const isImage = mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(file?.file_name || '');

  // Reset zoom on file change
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImageLoading(true);
    setImageError(false);
  }, [file?.file_id]);

  // Authenticated Blob loader for images
  useEffect(() => {
    if (!file || !isImage) return;

    let isMounted = true;
    setImageLoading(true);
    setImageError(false);

    let activeBlobUrl = null;

    api
      .get(`/files/${file.file_id}/download?inline=true`, { responseType: 'blob' })
      .then((res) => {
        if (!isMounted) return;
        activeBlobUrl = URL.createObjectURL(res.data);
        setBlobUrl(activeBlobUrl);
        setImageLoading(false);
      })
      .catch((err) => {
        console.warn('Blob fetch failed, falling back to direct URL:', err.message);
        if (isMounted) {
          const API_BASE = api.defaults.baseURL || '/api/v1';
          setBlobUrl(`${API_BASE}/files/${file.file_id}/download?inline=true`);
        }
      });

    return () => {
      isMounted = false;
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [file?.file_id, isImage]);

  // Load metadata for non-images
  useEffect(() => {
    if (!file) return;

    let isMounted = true;
    setMetadataLoading(true);

    fileService
      .previewFile(file.file_id)
      .then((res) => {
        if (isMounted && res.data?.data) {
          setPreviewData(res.data.data);
        }
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => {
        if (isMounted) setMetadataLoading(false);
      });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (isImage) {
        if (e.key === '+' || e.key === '=') {
          setZoom((prev) => Math.min(3, +(prev + 0.25).toFixed(2)));
        } else if (e.key === '-' || e.key === '_') {
          setZoom((prev) => Math.max(0.5, +(prev - 0.25).toFixed(2)));
        } else if (e.key === '0') {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [file, onClose, isImage]);

  if (!file) return null;

  const API_BASE = api.defaults.baseURL || '/api/v1';
  const streamUrl =
    previewData?.stream_url ||
    `${API_BASE}/files/${file.file_id}/download?inline=true`;

  const handleZoomIn = (e) => {
    if (e) e.stopPropagation();
    setZoom((prev) => Math.min(3, +(prev + 0.25).toFixed(2)));
  };

  const handleZoomOut = (e) => {
    if (e) e.stopPropagation();
    setZoom((prev) => {
      const next = Math.max(0.5, +(prev - 0.25).toFixed(2));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e) => {
    if (e) e.stopPropagation();
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (zoom <= 1) {
      setZoom(2);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // Mouse wheel zoom handler with passive: false to prevent scrolling
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container || !isImage) return;

    const handleWheelZoom = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      setZoom((prev) => {
        const next = Math.min(3, Math.max(0.5, +(prev + delta).toFixed(2)));
        if (next <= 1) {
          setPan({ x: 0, y: 0 });
        }
        return next;
      });
    };

    container.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelZoom);
    };
  }, [isImage, blobUrl]);

  // Mouse pan handlers when zoomed in
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan handlers for mobile
  const handleTouchStart = (e) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - pan.x,
      y: e.touches[0].clientY - pan.y,
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || zoom <= 1 || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleDownloadAction = () => {
    if (onDownload) {
      onDownload(file);
    } else {
      fileService.downloadFile(file.file_id).then((res) => {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  };

  const renderContent = () => {
    if (isImage) {
      if (imageError) {
        return (
          <div className="preview-no-support">
            <AlertCircle size={48} color="var(--red)" />
            <p>Failed to load image preview.</p>
            <button className="btn btn-primary" onClick={handleDownloadAction}>
              <Download size={18} />
              <span>Download Image</span>
            </button>
          </div>
        );
      }

      return (
        <div
          ref={imageContainerRef}
          className="preview-image-viewport"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          style={{
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
          title={zoom <= 1 ? 'Double click or scroll to zoom in' : 'Drag to pan • Double click to reset'}
        >
          {imageLoading && (
            <div className="preview-image-loading">
              <div
                className="spinner"
                style={{
                  width: 36,
                  height: 36,
                  borderColor: 'rgba(255,255,255,0.2)',
                  borderTopColor: 'white',
                }}
              />
              <span>Loading image...</span>
            </div>
          )}
          {blobUrl && (
            <img
              src={blobUrl}
              alt={file.file_name}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                display: imageLoading || imageError ? 'none' : 'block',
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                userSelect: 'none',
              }}
              draggable={false}
            />
          )}
        </div>
      );
    }

    if (metadataLoading) {
      return (
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div
            className="spinner"
            style={{
              margin: '0 auto 16px',
              borderColor: 'rgba(255,255,255,0.3)',
              borderTopColor: 'white',
            }}
          />
          <p>Loading preview...</p>
        </div>
      );
    }

    if (mime.startsWith('video/')) {
      return (
        <video controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%' }}>
          <source src={streamUrl} type={mime} />
          Your browser does not support video playback.
        </video>
      );
    }

    if (mime.startsWith('audio/')) {
      return (
        <div style={{ background: 'white', padding: 32, borderRadius: 16 }}>
          <audio controls autoPlay style={{ width: '100%', minWidth: 280 }}>
            <source src={streamUrl} type={mime} />
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    if (mime === 'application/pdf') {
      return (
        <iframe
          src={streamUrl}
          title={file.file_name}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
        />
      );
    }

    if (
      mime.startsWith('text/') ||
      mime === 'application/json' ||
      mime === 'application/javascript'
    ) {
      return (
        <iframe
          src={streamUrl}
          title={file.file_name}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: 'white' }}
        />
      );
    }

    return (
      <div className="preview-no-support">
        <FileQuestion size={64} />
        <p>No direct preview available for this file type.</p>
        <button className="btn btn-primary" onClick={handleDownloadAction}>
          <Download size={18} />
          <span>Download to View</span>
        </button>
      </div>
    );
  };

  return (
    <div
      className="preview-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Clicking backdrop closes modal
        if (e.target.classList.contains('preview-overlay')) {
          onClose();
        }
      }}
    >
      <div className="preview-header">
        <span className="preview-filename" title={file.file_name}>
          {file.file_name}
        </span>

        {/* Center: Image Zoom Controls */}
        {isImage && (
          <div className="preview-zoom-toolbar">
            <button
              className="preview-zoom-btn"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              title="Zoom out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              className="preview-zoom-indicator"
              onClick={handleResetZoom}
              title="Click to reset zoom (0)"
              aria-label="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              className="preview-zoom-btn"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            {zoom !== 1 && (
              <button
                className="preview-zoom-btn"
                onClick={handleResetZoom}
                title="Reset zoom (0)"
                aria-label="Reset"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        )}

        <div className="preview-actions">
          {onShare && (
            <button
              className="preview-action-btn"
              onClick={() => onShare(file)}
              title="Share file"
              aria-label="Share"
            >
              <Share2 size={18} />
            </button>
          )}
          <button
            className="preview-action-btn"
            onClick={handleDownloadAction}
            title="Download file"
            aria-label="Download"
          >
            <Download size={18} />
          </button>
          <button
            className="preview-action-btn close-btn"
            onClick={onClose}
            title="Close preview (Esc)"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="preview-content">
        {renderContent()}
      </div>

      {/* Mobile Floating Zoom Bar for Easy Touch Controls */}
      {isImage && (
        <div className="preview-mobile-zoom-bar">
          <button
            className="preview-zoom-btn"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            aria-label="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="preview-zoom-indicator" onClick={handleResetZoom}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="preview-zoom-btn"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            aria-label="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
          {zoom !== 1 && (
            <button
              className="preview-zoom-btn"
              onClick={handleResetZoom}
              aria-label="Reset"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
