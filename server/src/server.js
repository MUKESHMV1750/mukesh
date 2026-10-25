const app = require('./app');
const config = require('./config/env');

const PORT = config.port;

// Long-lived connections for large (up to 350MB) uploads/downloads
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║        DriveX Server is Running!          ║
  ╠═══════════════════════════════════════════╣
  ║  Port:        ${String(PORT).padEnd(28)}║
  ║  Environment: ${config.nodeEnv.padEnd(28)}║
  ║  Client URL:  ${config.clientUrl.padEnd(28)}║
  ║  Max upload:  350 MB                      ║
  ╚═══════════════════════════════════════════╝
  `);
});

server.timeout = 45 * 60 * 1000; // 45 minutes
server.headersTimeout = 46 * 60 * 1000;
server.requestTimeout = 45 * 60 * 1000;
server.keepAliveTimeout = 120 * 1000;

module.exports = server;
