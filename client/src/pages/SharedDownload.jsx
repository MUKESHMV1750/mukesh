import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, FileText, CheckCircle2, ShieldCheck, Lock, ExternalLink } from 'lucide-react';
import DriveXLogo from '../components/DriveXLogo';

export default function SharedDownload() {
  const { token } = useParams();
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    setDownloadUrl(`${apiBase}/share/${token}`);
  }, [token]);

  const handleDownload = () => {
    setDownloadStarted(true);
    window.location.href = downloadUrl;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.12), 0 0 1px 1px rgba(15, 23, 42, 0.04)',
          padding: '40px 32px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* DriveX Emblem */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <DriveXLogo size="lg" />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#eff6ff', color: '#2563eb', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, marginBottom: 12, border: '1px solid #bfdbfe' }}>
          <ShieldCheck size={14} />
          <span>DriveX Secure Share</span>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Shared Cloud File
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
          A private file has been securely shared with you via DriveX Google Cloud storage.
        </p>

        {/* File Preview Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '24px 20px',
            borderRadius: '18px',
            margin: '24px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              background: 'rgba(37, 99, 235, 0.1)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              color: '#2563eb',
            }}
          >
            <FileText size={30} />
          </div>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
            Ready to Download
          </h3>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
            Protected token • Fast direct download from cloud storage
          </p>
        </div>

        {/* Action Button */}
        <button
          className="btn btn-primary"
          onClick={handleDownload}
          style={{
            width: '100%',
            height: '48px',
            fontSize: '0.95rem',
            borderRadius: '14px',
            boxShadow: '0 10px 24px -4px rgba(37, 99, 235, 0.35)',
          }}
        >
          <Download size={18} />
          <span>{downloadStarted ? 'Downloading File...' : 'Download File Now'}</span>
        </button>

        {downloadStarted && (
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: '#16a34a',
              fontSize: '0.875rem',
              fontWeight: 600,
              padding: '10px 14px',
              background: '#f0fdf4',
              borderRadius: '12px',
              border: '1px solid #bbf7d0',
            }}
          >
            <CheckCircle2 size={16} />
            <span>Download initiated! If it didn't start automatically, click button again.</span>
          </div>
        )}

        {/* Footer info */}
        <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#94a3b8' }}>
            <Lock size={12} />
            <span>End-to-end encrypted</span>
          </div>
          <Link
            to="/login"
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#2563eb',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>Admin Login</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
