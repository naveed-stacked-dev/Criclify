const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// ─── Security ───
app.use(helmet());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// ─── Rate Limiting ───
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
// app.use('/api', limiter);

// ─── Body Parsing ───
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ───
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── API Routes ───
app.use('/api', routes);

// ─── Root ───
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏏 CricArena Management Platform API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// ─── 404 Handler ───
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ───
app.use(errorHandler);

module.exports = app;
