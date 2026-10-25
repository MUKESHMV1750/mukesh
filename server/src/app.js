const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const folderRoutes = require('./routes/folderRoutes');
const shareRoutes = require('./routes/shareRoutes');

const driveService = require('./services/driveService');
const authenticateAdmin = require('./middleware/authenticateAdmin');

const app = express();

// Trust proxy for Render / Vercel reverse proxy HTTPS termination
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS - support localhost, Vercel deployments (*.vercel.app), Render, and configured clientUrl
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // In development, allow all local origins
      if (
        config.nodeEnv === 'development' ||
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      // In production, allow all Vercel domains, Render domains, and configured clientUrl
      try {
        const parsed = new URL(origin);
        if (
          parsed.hostname.endsWith('.vercel.app') ||
          parsed.hostname.endsWith('.onrender.com') ||
          origin === config.clientUrl
        ) {
          return callback(null, true);
        }
      } catch (e) {}

      // Allow origin to ensure personal cloud functionality across custom deployment domains
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-admin-token', 'Origin'],
  })
);

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Body parsers (multipart uploads use multer disk storage — not these parsers)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Session
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.nodeEnv === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    },
  })
);

// API routes — mounted across /api/v1, /api, and root prefixes so Vercel/Render URLs always resolve
['/api/v1/auth', '/api/auth', '/auth'].forEach((prefix) => app.use(prefix, authRoutes));
['/api/v1/files', '/api/files', '/files'].forEach((prefix) => app.use(prefix, fileRoutes));
['/api/v1/folders', '/api/folders', '/folders'].forEach((prefix) => app.use(prefix, folderRoutes));
['/api/v1', '/api', '/'].forEach((prefix) => app.use(prefix, shareRoutes));

// Storage usage route across all standard paths
['/api/v1/storage/usage', '/api/storage/usage', '/storage/usage'].forEach((routePath) => {
  app.get(routePath, authenticateAdmin, async (req, res, next) => {
    try {
      const storage = await driveService.getStorageInfo();
      res.json({ success: true, data: storage });
    } catch (err) {
      next(err);
    }
  });
});

// Health checks for Render, Uptime monitors, and API clients
['/api/v1/health', '/api/health', '/health'].forEach((routePath) => {
  app.get(routePath, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
});

['/api/v1', '/api', '/'].forEach((routePath) => {
  app.get(routePath, (req, res) => {
    res.json({ status: 'ok', message: 'DriveX API Server is running', timestamp: new Date().toISOString() });
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
