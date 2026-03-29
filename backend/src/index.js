import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import gamesRouter from './routes/games.js';
import bggRouter from './routes/bgg.js';
import { tryAutoLogin } from './services/bggAuth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3001;

// CORS only needed in development — production serves frontend from same origin
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
}

app.use(express.json());

app.use('/api/games', gamesRouter);
app.use('/api/bgg', bggRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Serve React frontend in production
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

app.listen(PORT, async () => {
  console.log(`BoardVault backend running on http://localhost:${PORT}`);
  await tryAutoLogin();
});
