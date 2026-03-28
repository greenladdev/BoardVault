import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import gamesRouter from './routes/games.js';
import bggRouter from './routes/bgg.js';
import { tryAutoLogin } from './services/bggAuth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/games', gamesRouter);
app.use('/api/bgg', bggRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, async () => {
  console.log(`BoardVault backend running on http://localhost:${PORT}`);
  await tryAutoLogin();
});
