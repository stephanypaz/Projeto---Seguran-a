import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_RATE_WINDOW_MS = 60_000;
const API_RATE_LIMIT = 60;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const apiRateLimits = new Map<string, RateLimitEntry>();

function apiRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  const clientKey = req.ip || 'unknown-client';
  const current = apiRateLimits.get(clientKey);
  const entry = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + API_RATE_WINDOW_MS }
    : { count: current.count + 1, resetAt: current.resetAt };

  apiRateLimits.set(clientKey, entry);
  res.setHeader('X-RateLimit-Limit', API_RATE_LIMIT);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, API_RATE_LIMIT - entry.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

  if (entry.count > API_RATE_LIMIT) {
    res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    }

    next();
  });
  app.use('/api', apiRateLimit);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, 'config/vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
}

startServer();
