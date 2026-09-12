import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import { authRouter } from './routes/auth';
import { mandiRouter } from './routes/mandi';
import { matchingRouter } from './routes/matching';
import { storageRouter } from './routes/storage';
import { qualityRouter } from './routes/quality';
import { dashboardRouter } from './routes/dashboard';
import { assistantRouter } from './routes/assistant';
import { listingsRouter } from './routes/listings';
import { buyersRouter } from './routes/buyers';
import { transactionsRouter } from './routes/transactions';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // In development accept any localhost port (handles CRA's random port)
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // In production, match the configured FRONTEND_URL exactly
    const allowed = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (origin === allowed) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === 'true',
    version: '1.0.0'
  });
});

// Public routes
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/mandi', authMiddleware, mandiRouter);
app.use('/api/matching', authMiddleware, matchingRouter);
app.use('/api/storage', authMiddleware, storageRouter);
app.use('/api/quality', authMiddleware, qualityRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/assistant', authMiddleware, assistantRouter);
app.use('/api/listings', authMiddleware, listingsRouter);
app.use('/api/buyers', authMiddleware, buyersRouter);
app.use('/api/transactions', authMiddleware, transactionsRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🌾 Agri Platform Backend running on port ${PORT}`);
  console.log(`📊 Demo mode: ${process.env.DEMO_MODE === 'true' ? 'ON' : 'OFF'}`);
  console.log(`🤖 IBM Granite: ${process.env.WATSONX_API_KEY ? 'Configured' : 'Using mock fallback'}`);
});

export default app;
