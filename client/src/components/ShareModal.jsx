import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Clock, Trash2 } from 'lucide-react';
import shareService from '../services/shareService';
import { useToast } from '../context/ToastContext';

export default function ShareModal({ file, onClose }) {
  const { showToast } = useToast();
  const [expiresIn, setExpiresIn] = useState(24);
  const [shareData, setShareData] = useState(null);
  const [existingShares, setExistingShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!file) return;
    loadShareInfo();
  }, [file]);

  const loadShareInfo = async () => {
    setLoading(true);
    try {
      // Create new share link or get active shares
      const res = await shareService.createShare(file.file_id, expiresIn);
      if (res.data?.success) {
        setShareData(res.data.data);
      }
      const sharesRes = await shareService.getFileShares(file.file_id);
      if (sharesRes.data?.success) {
        setExistingShares(sharesRes.data.data || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create share link', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExpiryChange = async (e) => {
    const hours = Number(e.target.value);
    setExpiresIn(hours);
    try {
      const res = await shareService.createShare(file.file_id, hours);
      if (res.data?.success) {
        setShareData(res.data.data);
        showToast(`New link generated (expires in ${hours}h)`, 'info');
      }
    } catch {
      showToast('Error updating expiration', 'error');
    }
  };

  const handleCopy = () => {
    if (!shareData?.share_url) return;
    navigator.clipboard.writeText(shareData.share_url);
    setCopied(true);
    showToast('Link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!shareData) return;
    const url = shareData.whatsapp_url || `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out "${file.file_name}" on DriveX:\n${shareData.share_url}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleRevokeShare = async (shareId) => {
    try {
      await shareService.revokeShare(shareId);
      setExistingShares((prev) => prev.filter((s) => s.share_id !== shareId));
      showToast('Share link revoked', 'info');
      if (shareData?.share_id === shareId) {
        setShareData(null);
      }
    } catch {
      showToast('Failed to revoke link', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="stat-icon-wrap icon-green" style={{ width: 34, height: 34 }}>
              <Share2 size={18} />
            </div>
            <h2>Share File</h2>
          </div>
          <button className="btn-ghost" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Anyone with this link can view and download <strong>{file.file_name}</strong> without an account.
          </p>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label htmlFor="expiry-select" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Link Expiration
            </label>
            <select
              id="expiry-select"
              className="input-field"
              value={expiresIn}
              onChange={handleExpiryChange}
            >
              <option value={1}>1 hour</option>
              <option value={24}>24 hours (1 day)</option>
              <option value={168}>7 days</option>
              <option value={720}>30 days</option>
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : (
            <>
              <div className="share-modal-link">
                <input
                  type="text"
                  readOnly
                  value={shareData?.share_url || ''}
                  aria-label="Share URL"
                />
                <button
                  className="btn btn-primary"
                  onClick={handleCopy}
                  style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <button
                className="share-whatsapp-btn"
                onClick={handleWhatsAppShare}
                style={{ marginTop: 12, marginBottom: 20 }}
              >
                <Share2 />
                <span>Share directly to WhatsApp</span>
              </button>

              {existingShares.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    Active Share Links ({existingShares.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {existingShares.map((s) => (
                      <div
                        key={s.share_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-tertiary)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <div>
                          <div>Expires: {new Date(s.expires_at).toLocaleString()}</div>
                          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                            Status: {s.status}
                          </div>
                        </div>
                        {s.status === 'active' && (
                          <button
                            className="btn-ghost"
                            style={{ color: 'var(--red)', padding: 4 }}
                            onClick={() => handleRevokeShare(s.share_id)}
                            title="Revoke Link"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
