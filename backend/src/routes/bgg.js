import { Router } from 'express';
import { searchBGG, getBGGDetails } from '../services/bgg.js';
import { loginBGG, isAuthenticated, clearToken } from '../services/bggAuth.js';

const router = Router();

// GET /api/bgg/status — auth status
router.get('/status', (_req, res) => {
  res.json({ authenticated: isAuthenticated() });
});

// POST /api/bgg/auth — login with BGG credentials
router.post('/auth', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password)
    return res.status(400).json({ error: 'username and password are required' });
  try {
    const { token, debug } = await loginBGG(username, password);
    res.json({ ok: true, authenticated: true, debug });
  } catch (err) {
    console.error('BGG auth error:', err.message);
    res.status(401).json({ error: err.message, debug: err.debug });
  }
});

// DELETE /api/bgg/auth — logout
router.delete('/auth', (_req, res) => {
  clearToken();
  res.json({ ok: true });
});

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: 'Query is required' });
  try {
    const results = await searchBGG(q.trim());
    res.json(results);
  } catch (err) {
    console.error('BGG search error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

router.get('/details/:id', async (req, res) => {
  try {
    const details = await getBGGDetails(req.params.id);
    res.json(details);
  } catch (err) {
    console.error('BGG details error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

export default router;
