import React, { useEffect, useState, useRef } from 'react';
import {
  X, Download, Share2, FileQuestion, ZoomIn, ZoomOut, RotateCcw, AlertCircle, Upload, RefreshCw,
  ExternalLink, Copy, Check, FileText
} from 'lucide-react';
import api, { API_BASE_URL, MAX_UPLOAD_BYTES } from '../services/api';
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

  // Image zoom and pan states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageVersion, setImageVersion] = useState(0);

  // Text content loader states
  const [textContent, setTextContent] = useState(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState(false);
  const [textErrorMessage, setTextErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Image re-upload states
  const [isReuploading, setIsReuploading] = useState(false);
  const [reuploadError, setReuploadError] = useState(null);
  const imageContainerRef = useRef(null);
  const reuploadInputRef = useRef(null);

  const mime = (file?.mime_type || '').toLowerCase();
  const fileName = file?.file_name || '';
  const isImage = mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp|ico)$/i.test(fileName);
  const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(fileName);
  const isVideo = mime.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(fileName);
  const isAudio = mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(fileName);
  const isText =
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/javascript' ||
    /\.(txt|md|csv|json|js|jsx|ts|tsx|html|css|py|xml|log|env|yml|yaml|sql)$/i.test(fileName);
  const isOfficeDoc = /\.(docx?|xlsx?|pptx?)$/i.test(fileName);

  // Reset states when the target file changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImageError(false);
    setImageLoading(true);
    setTextContent(null);
    setTextLoading(false);
    setTextError(false);
    setTextErrorMessage('');
  }, [file?.file_id]);

  // Construct stream URL
  const token = localStorage.getItem('drivex_admin_token') || '';
  const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : '';
  const baseStreamUrl = `${API_BASE_URL}/files/${file?.file_id}/download?inline=true`;
  const streamUrl = `${baseStreamUrl}${tokenQuery}${imageVersion ? `&v=${imageVersion}` : ''}`;

  // Fetch text content for text/code preview
  useEffect(() => {
    if (!file || !isText) return;

    let isMounted = true;
    setTextLoading(true);
    setTextError(false);
    setTextErrorMessage('');

    api
      .get(`/files/${file.file_id}/download?inline=true`, {
        responseType: 'text',
        timeout: 30000,
      })
      .then((res) => {
        if (!isMounted) return;
        if (typeof res.data === 'string' && res.data.startsWith('{"success":false')) {
          try {
            const parsed = JSON.parse(res.data);
            setTextError(true);
            setTextErrorMessage(parsed.message || 'File content is not accessible.');
            return;
          } catch (e) {}
        }
        setTextContent(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2));
      })
      .catch((err) => {
        if (!isMounted) return;
        setTextError(true);
        setTextErrorMessage(err.response?.data?.message || err.message || 'Unable to load file content.');
      })
      .finally(() => {
        if (isMounted) setTextLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [file?.file_id, isText]);

  // Load preview metadata (Drive links, thumbnail links)
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
      .catch(() => {})
      .finally(() => {
        if (isMounted) setMetadataLoading(false);
      });

    // Keyboard navigation: Escape to close, + / - to zoom image
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

  // Mouse wheel zoom handler
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
  }, [isImage]);

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
        .catch(() => {
          window.open(streamUrl, '_blank');
        });
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
        setImageError(false);
        setImageLoading(true);
        setImageVersion((v) => v + 1);
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
              This image content was not found in storage. Re-upload it below to restore preview and download.
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
                    <span>Re-upload Image</span>
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
          <img
            src={streamUrl}
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
              display: imageError ? 'none' : 'block',
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              userSelect: 'none',
            }}
            draggable={false}
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <div style={{
          width: '92%',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
          <iframe
            src={streamUrl}
            title={file.file_name}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#323639',
            }}
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <video
          controls
          autoPlay
          src={streamUrl}
          style={{
            maxWidth: '92%',
            maxHeight: '85vh',
            borderRadius: 12,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          }}
        >
          Your browser does not support video playback.
        </video>
      );
    }

    if (isAudio) {
      return (
        <div style={{
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '36px 32px',
          borderRadius: 20,
          textAlign: 'center',
          maxWidth: 440,
          width: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}>
          <audio controls autoPlay src={streamUrl} style={{ width: '100%', minWidth: 280 }} />
          <p style={{ marginTop: 14, fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 500 }}>
            {file.file_name}
          </p>
        </div>
      );
    }

    if (isText) {
      if (textLoading) {
        return (
          <div style={{ textAlign: 'center', color: 'white', padding: 40 }}>
            <div className="top-sync-indicator" style={{ width: 140, height: 3, margin: '0 auto 16px', borderRadius: 2 }} />
            <p style={{ fontSize: '0.95rem', color: '#94a3b8' }}>Loading file content...</p>
          </div>
        );
      }

      if (textError || textContent === null) {
        return (
          <div className="preview-no-support" style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center', padding: '32px 20px' }}>
            <AlertCircle size={52} color="#f87171" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', margin: '0 0 10px 0' }}>
              Preview Unavailable
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              {textErrorMessage || 'Could not load text content directly.'}
            </p>
            <button className="btn btn-primary" onClick={handleDownloadAction} style={{ gap: 8, padding: '10px 22px', borderRadius: 12 }}>
              <Download size={18} />
              <span>Download File</span>
            </button>
          </div>
        );
      }

      return (
        <div style={{
          width: '92%',
          maxHeight: '85vh',
          background: '#0f172a',
          borderRadius: 12,
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.6)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 16px',
            borderBottom: '1px solid #1e293b',
            background: '#1e293b',
          }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>
              {file.file_name} ({formatFileSize(file.size_bytes || 0)})
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(textContent);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="btn btn-secondary"
              style={{ padding: '4px 12px', fontSize: '0.75rem', gap: 6, borderRadius: 6, height: 28 }}
            >
              {copied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>
          <pre style={{
            margin: 0,
            padding: 18,
            overflow: 'auto',
            fontSize: '0.85rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            color: '#e2e8f0',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {textContent}
          </pre>
        </div>
      );
    }

    if (isOfficeDoc) {
      const ext = fileName.split('.').pop().toLowerCase();
      const isWord = ['doc', 'docx'].includes(ext);
      const isExcel = ['xls', 'xlsx'].includes(ext);
      const isPpt = ['ppt', 'pptx'].includes(ext);
      const docTypeLabel = isWord ? 'Word Document' : isExcel ? 'Excel Spreadsheet' : isPpt ? 'PowerPoint Presentation' : 'Office Document';
      const badgeColor = isWord ? '#3b82f6' : isExcel ? '#10b981' : isPpt ? '#f59e0b' : '#64748b';
      const hasDrivePreview = previewData?.webViewLink && !previewData.webViewLink.includes('/api/v1');

      return (
        <div style={{
          background: 'rgba(30, 41, 59, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 20,
          padding: '40px 32px',
          maxWidth: 500,
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: `${badgeColor}22`,
            border: `2px solid ${badgeColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: badgeColor,
            fontWeight: 800,
            fontSize: '1.15rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            {ext}
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', wordBreak: 'break-word' }}>
              {file.file_name}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.875rem', margin: 0 }}>
              {docTypeLabel} · {formatFileSize(file.size_bytes || file.file_size || 0)}
            </p>
          </div>

          <p style={{
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: 1.5,
            maxWidth: 380,
            margin: '0 auto',
          }}>
            Office documents (.docx, .xlsx, .pptx) are preserved in their native format. Download below to open in Microsoft Office or your preferred reader.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', width: '100%', marginTop: 8 }}>
            <button
              className="btn btn-primary"
              onClick={handleDownloadAction}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 26px',
                borderRadius: 12,
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            >
              <Download size={18} />
              <span>Download Document</span>
            </button>

            {hasDrivePreview && (
              <a
                href={previewData.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: 12,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  color: 'white',
                }}
              >
                <ExternalLink size={18} />
                <span>Open in Drive</span>
              </a>
            )}

            {onShare && (
              <button
                className="btn btn-secondary"
                onClick={() => onShare(file)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: 12,
                  fontSize: '0.95rem',
                }}
              >
                <Share2 size={18} />
                <span>Share</span>
              </button>
            )}
          </div>
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
          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="preview-action-btn"
            title="Open in new tab"
            aria-label="Open in new tab"
          >
            <ExternalLink size={18} />
          </a>
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
