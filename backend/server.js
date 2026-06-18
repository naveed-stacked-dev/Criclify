const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const config = require('./src/config/env');
const { initRedis } = require('./src/config/redis');
const setupMatchSocket = require('./src/sockets/matchHandler');

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Initialize Redis (pub/sub for live scoring)
  await initRedis();

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: config.socket.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Store io instance on app for access in controllers
  app.set('io', io);

  // Setup socket handlers
  setupMatchSocket(io);

  // Start listening
  const PORT = config.port;
  server.listen(PORT, () => {
    console.log(`\n🏏 ════════════════════════════════════════════`);
    console.log(`   Club Arena X API Server`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   HTTP:        http://localhost:${PORT}`);
    console.log(`   WebSocket:   ws://localhost:${PORT}`);
    console.log(`   Health:      http://localhost:${PORT}/api/health`);
    console.log(`🏏 ════════════════════════════════════════════\n`);
  });

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Unhandled rejections
  process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err.message);
    server.close(() => process.exit(1));
  });
};

startServer();
