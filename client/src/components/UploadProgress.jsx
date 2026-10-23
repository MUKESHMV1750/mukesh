import React from 'react';
import { X, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function UploadProgress({ uploads = [], onClose }) {
  if (!uploads || uploads.length === 0) return null;

  const completedCount = uploads.filter((u) => u.status === 'complete' || u.status === 'done').length;
  const errorCount = uploads.filter((u) => u.status === 'error').length;
  const isAllDone = completedCount + errorCount === uploads.length;

  return (
    <div className="upload-progress-container">
      <div className="upload-progress-header">
        <span className="upload-progress-title">
          {isAllDone
            ? `Upload finished (${completedCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''})`
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: 8 }}>
                    {isComplete ? '100%' : isError ? 'Failed' : `${progressPercent}%`}
                  </span>
                </div>
                <div className="upload-progress-bar">
                  <div
                    className={`upload-progress-fill ${isComplete ? 'complete' : upload.status}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
