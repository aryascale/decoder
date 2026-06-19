import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createServer } from 'http';
import fs from 'fs';
import { runMigrations } from './src/lib/migrations.js';
import { initSocket } from './src/lib/socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3069;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PROJECT_ROOT = __dirname.endsWith('dist-server') ? path.resolve(__dirname, '..') : __dirname;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(PROJECT_ROOT, 'uploads');

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(compression());

app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      (req as any).rawBody = Buffer.concat(chunks);
      next();
    });
  } else {
    next();
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(PROJECT_ROOT, 'dist'), { maxAge: '1d' }));
app.use('/uploads', express.static(UPLOAD_DIR, { 
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

const apiHandler = async (req: any, res: any) => {
  const url = new URL(req.originalUrl, `http://${req.headers.host}`);
  let apiPath = url.pathname.replace('/api/', '').replace(/\//g, '-');

  const isCompiled = __filename.endsWith('.js');
  const ext = isCompiled ? '.js' : '.ts';
  const apiDir = isCompiled ? path.join(__dirname, 'api') : path.join(PROJECT_ROOT, 'api');
  const apiFilePath = path.join(apiDir, `${apiPath}${ext}`);

  try {
    if (!fs.existsSync(apiFilePath)) {
      return res.status(404).json({ error: `Endpoint not found: ${req.path}` });
    }
    const fileUrl = pathToFileURL(apiFilePath).href;
    const apiModule = await import(fileUrl);
    const handler = apiModule.default;

    if (!handler) throw new Error(`No default export found in ${apiFilePath}`);

    const contentType = req.headers['content-type'] || '';
    let body: string | null = null;
    let isBase64Encoded = false;

    if (contentType.includes('multipart/form-data') && (req as any).rawBody) {
      body = (req as any).rawBody.toString('binary');
    } else if (req.body && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body);
    }

    const result = await handler({
      httpMethod: req.method,
      headers: req.headers,
      cookies: req.cookies,
      queryStringParameters: Object.fromEntries(url.searchParams),
      body,
      isBase64Encoded,
    });

    res.status(result.statusCode);
    Object.entries(result.headers).forEach(([key, value]) => {
      res.setHeader(key, value as string);
    });
    res.send(result.body);
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

app.use('/api', apiHandler);

app.use((_req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'dist', 'index.html'));
});

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  // Run database migrations on startup
  await runMigrations();
});
