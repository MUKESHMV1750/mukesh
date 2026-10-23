import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  UploadCloud,
  ShieldCheck,
  Zap,
  MessageCircle,
  Image as ImageIcon,
  Play,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef(null);

  const rawFrom = location.state?.from?.pathname;
  const from = rawFrom && rawFrom !== '/login' ? rawFrom : '/';

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = password.trim();

    if (!trimmed) {
      setErrorMsg('Password is required.');
      triggerShake();
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await login(trimmed);
      setSuccessMsg('✓ Access granted! Entering dashboard...');
      showToast('Welcome back, Admin!', 'success');
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch (err) {
      let msg = err.response?.data?.message || err.response?.data?.error;
      if (err.response?.status === 404 || msg === 'Route not found') {
        msg = 'Backend route not found (404). Please ensure VITE_API_URL in Vercel settings points to your Render backend (e.g. https://your-app.onrender.com).';
      } else if (!msg) {
        if (!err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network') || err.message?.includes('ECONNREFUSED')) {
          msg = 'Unable to connect to backend server. Please verify your Render/local server is running and awake.';
        } else {
          msg = 'Invalid administrator password. Please try again.';
        }
      }
      setErrorMsg(msg);
      showToast(msg, 'error');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-v2">
      {/* Main Single-Page 2-Column Container */}
      <main className="login-main-container">
        
        {/* ================= LEFT COLUMN: HERO, CLOUD ECOSYSTEM & FEATURES ================= */}
        <section className="login-hero-col">
          {/* Top Brand Heading */}
          <div className="login-brand-header">
            <div className="login-brand-emblem-wrap">
              <div className="login-brand-emblem">
                <div className="login-brand-emblem-inner">
                  <svg
                    style={{ width: 28, height: 28, color: '#2563eb' }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="#3b82f6" />
                    <path d="M12 11v6" stroke="#2563eb" strokeWidth="2.5" />
                    <path d="m9.5 13.5 2.5-2.5 2.5 2.5" stroke="#2563eb" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>
              <h1 className="login-brand-title">
                Drive<span>X</span>
              </h1>
            </div>
            <p className="login-brand-sub">Cloud File Manager & Sharing System</p>
            <p className="login-brand-tagline">Secure • Fast • Easy • All Your Files in One Place</p>
          </div>

          {/* Center Illustration: Cloud + Radiating SVG Lines + Multi-Device Lineup */}
          <div className="login-illustration-area">
            {/* Radiating SVG Dotted Lines */}
            <svg className="login-radiating-svg" viewBox="0 0 520 280">
              <line x1="260" y1="130" x2="80" y2="90" stroke="#cbd5e1" strokeWidth="1.8" strokeDasharray="4 4" />
              <line x1="260" y1="130" x2="160" y2="40" stroke="#cbd5e1" strokeWidth="1.8" strokeDasharray="4 4" />
              <line x1="260" y1="130" x2="250" y2="25" stroke="#cbd5e1" strokeWidth="1.8" strokeDasharray="4 4" />
              <line x1="260" y1="130" x2="340" y2="35" stroke="#cbd5e1" strokeWidth="1.8" strokeDasharray="4 4" />
              <line x1="260" y1="130" x2="420" y2="65" stroke="#cbd5e1" strokeWidth="1.8" strokeDasharray="4 4" />
              <line x1="260" y1="130" x2="435" y2="120" stroke="#cbd5e1" strokeWidth="1.8" strokeDasharray="4 4" />
            </svg>

            {/* Stylized Multi-Bubble Cloud Base */}
            <div className="login-cloud-base">
              <div className="cloud-bubble-main" />
              <div className="cloud-bubble-top-left" />
              <div className="cloud-bubble-top-right" />
              <div className="cloud-bubble-bottom" />

              {/* Cloud Centerpiece */}
              <div className="cloud-centerpiece">
                <div className="cloud-centerpiece-inner">
                  <svg
                    style={{ width: 28, height: 28, color: '#ffffff' }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                    <path d="M12 12v9" strokeWidth="2.5" />
                    <path d="m8 17 4-4 4 4" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Floating File Badges */}
            {/* 1. Purple Image Badge */}
            <div className="badge-image badge-float" title="Photos & Images">
              <ImageIcon size={18} />
            </div>

            {/* 2. Blue Document Badge */}
            <div className="badge-doc badge-float" title="Documents & PDFs">
              <div className="badge-doc-line" />
              <div className="badge-doc-line" />
              <div className="badge-doc-line shorter" />
            </div>

            {/* 3. Green Sheet Badge */}
            <div className="badge-sheet badge-float" title="Spreadsheets & Tables">
              <div className="badge-sheet-grid">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>

            {/* 4. Yellow Slides Badge */}
            <div className="badge-slides badge-float" title="Presentations">
              <div className="badge-slides-inner">
                <div className="badge-slides-bar" />
              </div>
            </div>

            {/* 5. Red PDF Badge */}
            <div className="badge-pdf badge-float" title="PDF Files">
              PDF
            </div>

            {/* 6. Blue Video Badge */}
            <div className="badge-video badge-float" title="Videos & Media">
              <Play size={16} fill="white" />
            </div>

            {/* Devices Lineup Mockup: Laptop + Phone + Tablet */}
            <div className="device-lineup-wrap">
              {/* Device 1: Laptop Screen (Left) */}
              <div className="laptop-mockup">
                <div className="laptop-top-bar">
                  <span className="laptop-dot red" />
                  <span className="laptop-dot yellow" />
                  <span className="laptop-dot green" />
                </div>
                <div className="laptop-screen-content">
                  <div className="laptop-sidebar">
                    <div className="laptop-sidebar-item active" />
                    <div className="laptop-sidebar-item line-1" />
                    <div className="laptop-sidebar-item line-2" />
                    <div className="laptop-sidebar-item line-3" />
                  </div>
                  <div className="laptop-file-grid">
                    <div className="laptop-mini-card amber">
                      <div className="laptop-mini-icon" />
                      <div className="laptop-mini-text" />
                    </div>
                    <div className="laptop-mini-card blue">
                      <div className="laptop-mini-icon" />
                      <div className="laptop-mini-text" />
                    </div>
                    <div className="laptop-mini-card green">
                      <div className="laptop-mini-icon" />
                      <div className="laptop-mini-text" />
                    </div>
                    <div className="laptop-mini-card rose">
                      <div className="laptop-mini-icon" />
                      <div className="laptop-mini-text" />
                    </div>
                  </div>
                </div>
                <div className="laptop-stand" />
              </div>

              {/* Device 2: Smartphone Mockup (Center Foreground) */}
              <div className="smartphone-mockup">
                <div className="smartphone-screen">
                  <div className="smartphone-notch" />
                  <div className="smartphone-header">
                    <div className="smartphone-header-logo" />
                    <div className="smartphone-header-title" />
                  </div>
                  <div className="smartphone-list">
                    <div className="smartphone-list-item">
                      <div className="smartphone-item-dot amber" />
                      <div className="smartphone-item-text" style={{ width: 28 }} />
                    </div>
                    <div className="smartphone-list-item">
                      <div className="smartphone-item-dot blue" />
                      <div className="smartphone-item-text" style={{ width: 24 }} />
                    </div>
                    <div className="smartphone-list-item">
                      <div className="smartphone-item-dot green" />
                      <div className="smartphone-item-text" style={{ width: 32 }} />
                    </div>
                    <div className="smartphone-list-item">
                      <div className="smartphone-item-dot rose" />
                      <div className="smartphone-item-text" style={{ width: 20 }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Device 3: Tablet Screen (Right) */}
              <div className="tablet-mockup">
                <div className="tablet-screen">
                  <div className="tablet-top-bar">
                    <div style={{ width: 12, height: 4, background: '#3b82f6', borderRadius: 2 }} />
                    <div style={{ width: 32, height: 4, background: '#cbd5e1', borderRadius: 2 }} />
                  </div>
                  <div className="tablet-grid">
                    <div className="tablet-grid-card amber"><div className="tablet-grid-icon" /></div>
                    <div className="tablet-grid-card green"><div className="tablet-grid-icon" /></div>
                    <div className="tablet-grid-card blue"><div className="tablet-grid-icon" /></div>
                    <div className="tablet-grid-card rose"><div className="tablet-grid-icon" /></div>
                    <div className="tablet-grid-card indigo"><div className="tablet-grid-icon" /></div>
                    <div className="tablet-grid-card teal"><div className="tablet-grid-icon" /></div>
                    <div className="tablet-grid-card amber"><div className="tablet-grid-icon" /></div>
                    <div className="tablet-grid-card blue"><div className="tablet-grid-icon" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 4 Feature Highlights Columns */}
          <div className="login-features-row">
            {/* 1. Upload */}
            <div className="feature-col">
              <div className="feature-col-icon blue">
                <UploadCloud size={20} />
              </div>
              <h4 className="feature-col-title">Upload</h4>
              <p className="feature-col-desc">All file formats<br />supported</p>
            </div>

            {/* 2. Secure */}
            <div className="feature-col">
              <div className="feature-col-icon green">
                <ShieldCheck size={20} />
              </div>
              <h4 className="feature-col-title">Secure</h4>
              <p className="feature-col-desc">Your data is<br />always protected</p>
            </div>

            {/* 3. Fast */}
            <div className="feature-col">
              <div className="feature-col-icon amber">
                <Zap size={20} fill="#f59e0b" />
              </div>
              <h4 className="feature-col-title">Fast</h4>
              <p className="feature-col-desc">Quick & reliable<br />uploads</p>
            </div>

            {/* 4. Share (WhatsApp) */}
            <div className="feature-col">
              <div className="feature-col-icon whatsapp">
                <MessageCircle size={20} />
              </div>
              <h4 className="feature-col-title">Share</h4>
              <p className="feature-col-desc">Directly to<br />WhatsApp</p>
            </div>
          </div>
        </section>

        {/* ================= RIGHT COLUMN: ADMIN LOGIN FLOATING CARD ================= */}
        <section className="login-card-col">
          <div
            id="login-card"
            ref={cardRef}
            className={`login-card-v2 ${isShaking ? 'shake' : ''}`}
          >
            {/* DriveX Emblem inside Login Card */}
            <div className="login-card-logo-emblem">
              <div className="login-card-logo-inner">
                <svg
                  style={{ width: 34, height: 34, color: '#2563eb' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="#3b82f6" />
                  <path d="M12 11v6" stroke="#2563eb" strokeWidth="2.5" />
                  <path d="m9.5 13.5 2.5-2.5 2.5 2.5" stroke="#2563eb" strokeWidth="2.5" />
                </svg>
              </div>
            </div>

            <h2 className="login-card-brand-title">
              Drive<span>X</span>
            </h2>

            {/* Admin Login Title & Subtitle */}
            <h3 className="login-card-heading">Admin Login</h3>
            <p className="login-card-subheading">
              Enter the password to access your DriveX dashboard.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="login-form-v2">
              <div className="password-input-group">
                <span className="password-lock-icon">
                  <Lock size={16} />
                </span>

                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password-input"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="password-field-v2"
                  autoFocus
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-eye-btn"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              {/* Status Message */}
              {errorMsg && (
                <div className="status-msg-box error" role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="status-msg-box success" role="status">
                  <CheckCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading || !password.trim()}
              >
                {loading ? (
                  <>
                    <span className="login-btn-spinner" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Authorized Admin Footnote */}
            <div className="login-authorized-footnote">
              <Lock size={14} />
              <span>Only authorized admin can access this system.</span>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
