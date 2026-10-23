import React from 'react';

export default function DriveXLogo({ size = 'md', showText = true, className = '', onClick }) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const wrapSize = isSm ? 36 : isLg ? 48 : 40;
  const iconSize = isSm ? 20 : isLg ? 28 : 24;
  const radius = isSm ? '11px' : isLg ? '16px' : '13px';

  return (
    <div
      className={`drivex-brand ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? 10 : 12,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Signature Gradient Emblem from Index Page */}
      <div
        className="drivex-emblem-wrap"
        style={{
          width: wrapSize,
          height: wrapSize,
          flexShrink: 0,
          borderRadius: radius,
          background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #06b6d4 100%)',
          padding: '2px',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s ease',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#ffffff',
            borderRadius: `calc(${radius} - 2px)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <svg
            style={{ width: iconSize, height: iconSize }}
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

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span
            style={{
              fontSize: isSm ? '1.25rem' : isLg ? '1.75rem' : '1.375rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.03em',
              fontFamily: '"Plus Jakarta Sans", Inter, -apple-system, sans-serif',
            }}
          >
            Drive<span style={{ color: '#2563eb' }}>X</span>
          </span>
        </div>
      )}
    </div>
  );
}
