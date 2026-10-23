const app = require('./app');
const config = require('./config/env');

const PORT = config.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║        DriveX Server is Running!          ║
  ╠═══════════════════════════════════════════╣
  ║  Port:        ${String(PORT).padEnd(28)}║
  ║  Environment: ${config.nodeEnv.padEnd(28)}║
  ║  Client URL:  ${config.clientUrl.padEnd(28)}║
  ╚═══════════════════════════════════════════╝
  `);
});
