import React, { useState, useEffect } from 'react';
import { Cloud, HardDrive, AlertCircle, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import fileService from '../services/fileService';
import { formatFileSize, formatDate } from '../utils/formatFileSize';
import { getFileIcon } from '../utils/fileIcons';
import { useToast } from '../context/ToastContext';

export default function StoragePage() {
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [storageRes, filesRes] = await Promise.all([
        fileService.getStorageUsage().catch(() => ({ data: { success: false } })),
        fileService.listFiles({ status: 'active' }),
      ]);

      if (storageRes.data?.success) {
        setStorageData(storageRes.data.data);
      }
      if (filesRes.data?.success) {
        setFiles(filesRes.data.data || []);
      }
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || 'Error loading storage details');
      showToast('Error loading storage details', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Group files by category
  const breakdown = {
    documents: { bytes: 0, count: 0, color: 'var(--primary)', label: 'Documents & PDFs' },
    images: { bytes: 0, count: 0, color: 'var(--green)', label: 'Images & Photos' },
    videos: { bytes: 0, count: 0, color: 'var(--red)', label: 'Videos & Movies' },
    audio: { bytes: 0, count: 0, color: 'var(--yellow)', label: 'Audio & Music' },
    others: { bytes: 0, count: 0, color: 'var(--text-secondary)', label: 'Archives & Other' },
  };

  files.forEach((f) => {
    const size = Number(f.file_size || 0);
    const mime = f.mime_type || '';
    if (mime.startsWith('image/')) {
      breakdown.images.bytes += size;
      breakdown.images.count++;
    } else if (mime.startsWith('video/')) {
      breakdown.videos.bytes += size;
      breakdown.videos.count++;
    } else if (mime.startsWith('audio/')) {
      breakdown.audio.bytes += size;
      breakdown.audio.count++;
    } else if (
      mime.includes('pdf') ||
      mime.includes('document') ||
      mime.includes('sheet') ||
      mime.includes('presentation') ||
      mime.includes('text')
    ) {
      breakdown.documents.bytes += size;
      breakdown.documents.count++;
    } else {
      breakdown.others.bytes += size;
      breakdown.others.count++;
    }
  });

  const totalLocalFilesBytes = Object.values(breakdown).reduce((acc, b) => acc + b.bytes, 0);

  const usageBytes = Number(
    storageData?.usageInDrive || storageData?.usage || totalLocalFilesBytes
  );
  const limitBytes = Number(storageData?.limit || 16106127360); // 15 GB
  const percentUsed = limitBytes > 0 ? Math.min(100, Math.round((usageBytes / limitBytes) * 100)) : 0;

  // SVG Donut calculation
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentUsed / 100) * circumference;

  // Largest files
  const largestFiles = [...files]
    .sort((a, b) => Number(b.file_size || 0) - Number(a.file_size || 0))
    .slice(0, 10);

  return (
    <div className="dashboard-layout">
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        storageInfo={storageData}
      />

      <main className="main-content">
        <div className="page-header">
          <div className="page-header-info">
            <div className="page-title-row">
              <div className="stat-icon-wrap icon-indigo" style={{ width: 34, height: 34 }}>
                <HardDrive size={18} />
              </div>
              <h1 className="page-title">Storage Analytics</h1>
              <span className="page-title-badge" style={{ background: '#eef2ff', color: '#4f46e5', borderColor: '#c7d2fe' }}>
                {percentUsed}% Used
              </span>
            </div>
            <p className="page-subtitle">
              Real-time Google Drive Cloud Storage allocation and file category distribution
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
            <p>Analyzing storage usage...</p>
          </div>
        ) : loadError ? (
          <div className="empty-state error-state">
            <AlertCircle size={44} />
            <h3>Unable to load storage overview</h3>
            <p>{loadError}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={loadStorageData}
              style={{ marginTop: 8 }}
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <>
            <div className="storage-overview">
              <div className="storage-circle-container">
                <div className="storage-circle">
                  <svg viewBox="0 0 180 180">
                    <circle
                      className="storage-circle-bg"
                      cx="90"
                      cy="90"
                      r={radius}
                    />
                    <circle
                      className="storage-circle-fill"
                      cx="90"
                      cy="90"
                      r={radius}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <div className="storage-circle-text">
                    <span className="storage-percentage">{percentUsed}%</span>
                    <span className="storage-label">used</span>
                  </div>
                </div>

                <div className="storage-details">
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatFileSize(usageBytes)} of {formatFileSize(limitBytes)} used
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                      {files.length} files currently stored in Google Drive
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 16 }}>
                    {Object.entries(breakdown).map(([key, data]) => (
                      <div key={key} className="storage-detail-item">
                        <div
                          className="storage-detail-dot"
                          style={{ backgroundColor: data.color }}
                        />
                        <div className="storage-detail-info">
                          <span className="storage-detail-label">{data.label}</span>
                          <span className="storage-detail-value">{formatFileSize(data.bytes)}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {data.count} file{data.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Largest Files Table */}
            <section>
              <div className="section-title">
                Largest Files in Drive ({largestFiles.length})
              </div>

              {largestFiles.length === 0 ? (
                <div className="empty-state">
                  <Cloud size={48} />
                  <h3>No files uploaded yet</h3>
                </div>
              ) : (
                <div className="file-list">
                  <div className="file-list-header">
                    <span>Name</span>
                    <span>Date Uploaded</span>
                    <span>File Size</span>
                    <span>Type</span>
                    <span>Action</span>
                  </div>
                  {largestFiles.map((file) => {
                    const iconInfo = getFileIcon(file.file_name);
                    const Icon = iconInfo.icon;
                    return (
                      <div key={file.file_id} className="file-list-row">
                        <div className="file-list-name">
                          <div style={{ color: iconInfo.color }}>
                            <Icon size={20} />
                          </div>
                          <span className="file-list-name-text" title={file.file_name}>
                            {file.file_name}
                          </span>
                        </div>
                        <div className="file-list-cell">{formatDate(file.created_at)}</div>
                        <div className="file-list-cell" style={{ fontWeight: 600 }}>
                          {formatFileSize(file.file_size)}
                        </div>
                        <div className="file-list-cell" style={{ textTransform: 'uppercase' }}>
                          {file.file_name.split('.').pop() || 'FILE'}
                        </div>
                        <div className="file-list-cell">
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={async () => {
                              try {
                                showToast(`Downloading ${file.file_name}`, 'info');
                                const res = await fileService.downloadFile(file.file_id);
                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = file.file_name;
                                link.click();
                                window.URL.revokeObjectURL(url);
                              } catch {
                                showToast('Download failed', 'error');
                              }
                            }}
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
