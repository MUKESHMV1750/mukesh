import React, { useEffect, useState, useRef } from 'react';
import {
  X, Download, Share2, FileQuestion, ZoomIn, ZoomOut, RotateCcw, AlertCircle, Upload, RefreshCw
} from 'lucide-react';
import api, { transferTimeoutMs, MAX_UPLOAD_BYTES } from '../services/api';
import fileService from '../services/fileService';
import { formatFileSize } from '../utils/formatFileSize';

export default function FilePreviewModal({
  file,
  onClose,
  onDownload,
  onShare,
  onFileUpdated,
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
  const [imageErrorMessage, setImageErrorMessage] = useState('');
  const [isReuploading, setIsReuploading] = useState(false);
  const [reuploadError, setReuploadError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const imageContainerRef = useRef(null);
  const reuploadInputRef = useRef(null);

  const mime = file?.mime_type || '';
  const isImage = mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(file?.file_name || '');

  // Reset zoom on file change
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImageLoading(true);
    setImageError(false);
    setImageErrorMessage('');
  }, [file?.file_id]);

  // Authenticated Blob loader for images
  useEffect(() => {
    if (!file || !isImage) return;

    let isMounted = true;
    setImageLoading(true);
    setImageError(false);
    setImageErrorMessage('');
    setBlobUrl((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });

    let activeBlobUrl = null;
    const size = Number(file.size_bytes || file.file_size || 0);

    api
      .get(`/files/${file.file_id}/download?inline=true`, {
        responseType: 'blob',
        timeout: transferTimeoutMs(size || MAX_UPLOAD_BYTES),
      })
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.type && String(res.data.type).includes('application/json')) {
          setImageLoading(false);
          setImageError(true);
          setImageErrorMessage('Image content is missing. Please re-upload.');
          return;
        }
        activeBlobUrl = URL.createObjectURL(res.data);
        setBlobUrl(activeBlobUrl);
        setImageLoading(false);
        setImageError(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Blob fetch failed:', err.message);
        const is404 = err.response?.status === 404;
        if (is404 || err.code === 'ECONNABORTED') {
          setImageLoading(false);
          setImageError(true);
          setImageErrorMessage(
            err.code === 'ECONNABORTED'
              ? `Timed out loading this ${formatFileSize(size)} image. Try downloading instead.`
              : err.response?.data?.message ||
                'Image content is missing from storage. Please re-upload below.'
          );
          return;
        }

        const token = localStorage.getItem('drivex_admin_token') || '';
        const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
        const API_BASE = api.defaults.baseURL || '/api/v1';
        setBlobUrl(`${API_BASE}/files/${file.file_id}/download?inline=true${tokenParam}`);
        setImageLoading(false);
      });

    const safetyTimer = setTimeout(() => {
      if (isMounted) setImageLoading(false);
    }, Math.min(transferTimeoutMs(size || 0), 120000));

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [file?.file_id, file?.size_bytes, file?.file_size, isImage]);

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

  const token = localStorage.getItem('drivex_admin_token') || '';
  const tokenQuery = token ? `token=${encodeURIComponent(token)}` : '';
  const withAuthToken = (url) => {
    if (!url || !token) return url;
    return url.includes('?') ? `${url}&${tokenQuery}` : `${url}?${tokenQuery}`;
  };

  const API_BASE = api.defaults.baseURL || '/api/v1';
  const rawStreamUrl =
    previewData?.stream_url ||
    `${API_BASE}/files/${file.file_id}/download?inline=true`;
  const streamUrl = withAuthToken(rawStreamUrl);

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
      fileService
        .downloadFile(file.file_id, file.size_bytes || file.file_size || 0)
        .then((res) => {
          const url = URL.createObjectURL(res.data);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.file_name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        })
        .catch(() => {});
    }
  };

  const handleReupload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setReuploadError(`File exceeds ${formatFileSize(MAX_UPLOAD_BYTES)} limit`);
      return;
    }

    setIsReuploading(true);
    setReuploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fileService.reuploadFile(
        file.file_id,
        formData,
        undefined,
        selectedFile.size
      );
      if (res.data?.success) {
        const blobRes = await api.get(`/files/${file.file_id}/download?inline=true`, {
          responseType: 'blob',
          timeout: transferTimeoutMs(selectedFile.size),
        });
        const newBlobUrl = URL.createObjectURL(blobRes.data);
        setBlobUrl((prev) => {
          if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
          return newBlobUrl;
        });
        setImageError(false);
        setImageLoading(false);
        if (onFileUpdated && res.data.data) {
          onFileUpdated(res.data.data);
        }
      }
    } catch (err) {
      setReuploadError(err.response?.data?.message || err.message || 'Failed to re-upload image');
    } finally {
      setIsReuploading(false);
      if (reuploadInputRef.current) {
        reuploadInputRef.current.value = '';
      }
    }
  };

  const renderContent = () => {
    if (isImage) {
      if (imageError) {
        return (
          <div className="preview-no-support" style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center', padding: '32px 20px' }}>
            <AlertCircle size={52} color="#f87171" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', margin: '0 0 10px 0' }}>
              Image Preview Unavailable
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              {imageErrorMessage || 'This image was stored in temporary storage and has expired. Re-upload it below to restore permanent preview and download.'}
            </p>

            <input
              type="file"
              ref={reuploadInputRef}
              onChange={handleReupload}
              accept="image/*"
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => reuploadInputRef.current?.click()}
                disabled={isReuploading}
                style={{ gap: 8, padding: '10px 22px', borderRadius: 12, fontSize: '0.9rem' }}
              >
                {isReuploading ? (
                  <>
                    <RefreshCw size={18} className="spinner" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>Re-upload This Image</span>
                  </>
                )}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleDownloadAction}
                style={{ gap: 8, padding: '10px 18px', borderRadius: 12, fontSize: '0.9rem' }}
              >
                <Download size={18} />
                <span>Download</span>
              </button>
            </div>

            {reuploadError && (
              <p style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: 14 }}>
                {reuploadError}
              </p>
            )}
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
              <div className="top-sync-indicator" style={{ width: 140, height: 3, borderRadius: 2 }} />
              <span style={{ marginTop: 8, fontSize: '0.85rem' }}>Loading image...</span>
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
        <div style={{ textAlign: 'center', color: 'white', padding: 20 }}>
          <div className="top-sync-indicator" style={{ width: 140, height: 3, margin: '0 auto 16px', borderRadius: 2 }} />
          <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Loading preview...</p>
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
