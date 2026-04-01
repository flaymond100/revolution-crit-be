'use strict';

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');

const app = express();

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Body parsing (JSON) – the webhook route uses express.raw(), so it must be
// registered on the router BEFORE this global middleware applies.
// ---------------------------------------------------------------------------
app.use(express.json());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

// ---------------------------------------------------------------------------
// 404 fallback
// ---------------------------------------------------------------------------
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
