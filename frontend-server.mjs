import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const docsDir = path.join(__dirname, 'docs', '.vitepress', 'dist');
const port = Number(process.env.FRONTEND_PORT || process.env.VITE_PORT || 5101);
const apiTarget = process.env.VITE_API_URL || 'http://localhost:5102';

const app = express();

app.use(compression());

// Forward API calls so the SPA can live behind a single origin
app.use(
  '/api',
  createProxyMiddleware({
    target: apiTarget,
    changeOrigin: true,
    proxyTimeout: 10000,
    pathRewrite: (path) => `/api${path}`,
    onError(err, req, res) {
      console.error('Proxy error', err);
      if (!res.headersSent) {
        res.status(502).json({ error: 'API proxy error' });
      }
    },
  })
);

app.use(express.static(distDir));

if (fs.existsSync(docsDir)) {
  app.use('/docs', express.static(docsDir));
}

app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  if (req.path.startsWith('/docs')) {
    return next();
  }

  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Web2 frontend ready on port ${port} (proxy -> ${apiTarget})`);
});
