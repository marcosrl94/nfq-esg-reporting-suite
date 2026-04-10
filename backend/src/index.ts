/**
 * Backend API Server - Entry Point
 *
 * Nota (2026): el front de NFQ ESG Reporting Suite usa Supabase como fuente de verdad.
 * Este servidor Express sirve como referencia legacy / posibles workers batch; no duplicar
 * CRUD de datapoints en paralelo sin migración explícita.
 */
import express, { Express } from 'express';
import datapointsRouter from './api/routes/datapoints';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isProd = process.env.NODE_ENV === 'production';
const corsOrigin =
  process.env.CORS_ORIGIN ?? (isProd ? undefined : 'http://localhost:5173');

app.use((req, res, next) => {
  if (corsOrigin) {
    res.header('Access-Control-Allow-Origin', corsOrigin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-user-id, x-organization-id, x-user-email, x-user-name, x-user-role, x-user-department'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/datapoints', datapointsRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Backend API Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📝 API Docs: http://localhost:${PORT}/api/datapoints`);
  });
}

export default app;
