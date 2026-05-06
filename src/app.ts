import express, { Application, Request, Response, NextFunction } from 'express'; // typed
import cors from 'cors';

import { handleWebhook } from './controllers/paymentController';
import authRoutes from './routes/auth';
import paymentRoutes from './routes/payments';

const app: Application = express(); // typed

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isDev = process.env.NODE_ENV !== 'production';

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (isDev && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
};

app.use(cors(corsOptions));

// ---------------------------------------------------------------------------
// Stripe webhook (raw body required for signature verification)
// ---------------------------------------------------------------------------
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// ---------------------------------------------------------------------------
// Body parsing (JSON) for the rest of the API.
// ---------------------------------------------------------------------------
app.use(express.json());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' })); // typed

// ---------------------------------------------------------------------------
// Public test endpoint
// ---------------------------------------------------------------------------
app.get('/test', (_req: Request, res: Response) => res.json({ success: true, message: 'API is reachable' })); // typed

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

// ---------------------------------------------------------------------------
// 404 fallback
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => res.status(404).json({ error: 'Route not found' })); // typed

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

interface AppError extends Error { // typed — shape expected by all Express error-throwing code in this project
  status?: number;
}

// eslint-disable-next-line no-unused-vars
app.use((err: AppError, _req: Request, res: Response, _next: NextFunction): void => { // typed
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app; // typed
