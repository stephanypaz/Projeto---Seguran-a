import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_RATE_WINDOW_MS = 60_000;
const API_RATE_LIMIT = 60;
const VITALS_RATE_WINDOW_MS = 60_000;
const VITALS_RATE_LIMIT = 5;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type ImcRequest = {
  peso: number;
  altura: number;
};

const apiRateLimits = new Map<string, RateLimitEntry>();
const vitalsRateLimits = new Map<string, RateLimitEntry>();

function calculateImc(peso: number, altura: number): number {
  if (!peso || !altura || altura <= 0 || peso <= 0) {
    throw new Error('Peso e altura inválidos.');
  }

  const alturaEmMetros = altura / 100;
  return Number((peso / (alturaEmMetros * alturaEmMetros)).toFixed(2));
}

function classifyImc(imc: number): string {
  if (imc < 18.5) return 'abaixo do esperado';
  if (imc < 25) return 'ideal';
  return 'acima do esperado';
}

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
    res.status(429).json({
      error: 'Muitas requisições em pouco tempo.',
      message: 'Tente novamente mais tarde.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
    return;
  }

  next();
}

function vitalsRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  const clientKey = req.ip || 'unknown-client';
  const current = vitalsRateLimits.get(clientKey);
  const entry = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + VITALS_RATE_WINDOW_MS }
    : { count: current.count + 1, resetAt: current.resetAt };

  vitalsRateLimits.set(clientKey, entry);
  res.setHeader('X-Vitals-RateLimit-Limit', VITALS_RATE_LIMIT);
  res.setHeader('X-Vitals-RateLimit-Remaining', Math.max(0, VITALS_RATE_LIMIT - entry.count));
  res.setHeader('X-Vitals-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

  if (entry.count > VITALS_RATE_LIMIT) {
    res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
    res.status(429).json({
      error: 'Limite atingido.',
      message: 'Você só pode enviar 5 sinais vitais por minuto.',
      code: 'VITALS_RATE_LIMIT_EXCEEDED',
    });
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
  app.use('/api/vitals', vitalsRateLimit);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/api/vitals', (req, res) => {
    res.status(201).json({
      success: true,
      message: 'Sinal vital registrado com sucesso.',
      data: {
        receivedAt: new Date().toISOString(),
        limitPerMinute: VITALS_RATE_LIMIT,
      },
    });
  });

  app.post('/api/medical/imc', (req, res) => {
    const { peso, altura } = req.body as Partial<ImcRequest>;

    if (typeof peso !== 'number' || typeof altura !== 'number') {
      return res.status(400).json({
        error: 'Dados inválidos.',
        message: 'Envie apenas peso e altura em números.',
        code: 'INVALID_IMC_INPUT',
      });
    }

    try {
      const imc = calculateImc(peso, altura);
      const classificacao = classifyImc(imc);

      return res.status(200).json({
        success: true,
        message: 'IMC calculado pelo servidor.',
        data: {
          peso,
          altura,
          imc,
          classificacao,
          calculadoEm: new Date().toISOString(),
        },
      });
    } catch (error) {
      return res.status(400).json({
        error: 'IMC inválido.',
        message: 'Peso e altura devem ser valores positivos e válidos.',
        code: 'INVALID_IMC_VALUES',
      });
    }
  });

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({
        error: 'Rota da API não encontrada.',
        message: `A rota ${req.path} não existe neste backend.`,
        code: 'API_NOT_FOUND',
      });
      return;
    }

    res.status(404).send('Página não encontrada.');
  });

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const isJsonParseError =
      err instanceof SyntaxError &&
      'body' in err &&
      typeof err.message === 'string' &&
      err.message.toLowerCase().includes('json');



// mensagens de erro personalizadas para diferentes tipos de erros
    if (isJsonParseError) {
      res.status(400).json({
        error: 'JSON inválido.',
        message: 'O corpo da requisição não pôde ser interpretado como JSON válido.',
        code: 'INVALID_JSON',
      });
      return;
    }

    if (err && err.status === 429) {
      res.status(429).json({
        error: 'Muitas requisições em pouco tempo.',
        message: 'Aguarde alguns instantes antes de tentar novamente.',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    console.error('Erro interno do servidor:', err);
    res.status(500).json({
      error: 'Erro interno do servidor.',
      message: 'Ocorreu uma falha inesperada. Tente novamente mais tarde.',
      code: 'INTERNAL_SERVER_ERROR',
    });
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
