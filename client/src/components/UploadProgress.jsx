import React from 'react';
import { X, CheckCircle, AlertCircle, Loader, RotateCcw } from 'lucide-react';
import { formatFileSize } from '../utils/formatFileSize';

export default function UploadProgress({ uploads = [], onClose, onRetry }) {
  if (!uploads || uploads.length === 0) return null;

  const completedCount = uploads.filter((u) => u.status === 'complete' || u.status === 'done').length;
  const errorCount = uploads.filter((u) => u.status === 'error').length;
  const isAllDone = completedCount + errorCount === uploads.length;

  return (
    <div className="upload-progress-container">
      <div className="upload-progress-header">
        <span className="upload-progress-title">
          {isAllDone
            ? `Upload complete (${completedCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''})`
            : `Uploading (${completedCount}/${uploads.length})`}
        </span>
        <button
          className="btn-ghost"
          style={{ padding: '4px' }}
          onClick={onClose}
          aria-label="Close upload progress"
        >
          <X size={16} />
        </button>
      </div>

      <div className="upload-progress-list">
        {uploads.map((upload) => {
          const isComplete = upload.status === 'complete' || upload.status === 'done';
          const isError = upload.status === 'error';
          const isUploading = upload.status === 'uploading';
          const progressPercent = isComplete ? 100 : Math.min(100, Math.max(0, upload.progress || 0));
          const fileSize = upload.size || upload.file?.size || 0;
          const loadedBytes = Math.round((progressPercent / 100) * fileSize);

          return (
            <div key={upload.id} className="upload-progress-item">
              <div style={{ flexShrink: 0 }}>
                {isUploading && (
                  <Loader size={18} className="spinner" style={{ width: 18, height: 18 }} />
                )}
                {isComplete && (
                  <CheckCircle size={18} color="var(--green)" />
                )}
                {isError && (
                  <AlertCircle size={18} color="var(--red)" />
                )}
              </div>

              <div className="upload-progress-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div className="upload-progress-name" title={upload.name}>
                    {upload.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {isComplete ? '100%' : isError ? 'Failed' : `${progressPercent}%`}
                    </span>
                    {isError && onRetry && (
                      <button
                        type="button"
                        onClick={() => onRetry(upload)}
                        title="Retry upload"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--primary)',
                          display: 'flex',
                          padding: 2,
                        }}
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="upload-progress-bar">
                  <div
                    className={`upload-progress-fill ${isComplete ? 'complete' : upload.status}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                  <span>{formatFileSize(loadedBytes)} of {formatFileSize(fileSize)}</span>
                  <span>{isComplete ? 'Saved' : isError ? 'Network/server error' : 'Uploading...'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
