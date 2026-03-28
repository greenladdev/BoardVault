import { Router } from 'express';
import db from '../db.js';
import { getBGGDetails } from '../services/bgg.js';

const router = Router();

function parseGame(row) {
  if (!row) return null;
  return {
    ...row,
    categories: JSON.parse(row.categories ?? '[]'),
    mechanics: JSON.parse(row.mechanics ?? '[]'),
  };
}

// GET /api/games — list all games
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM games ORDER BY title ASC').all();
  res.json(rows.map(parseGame));
});

// POST /api/games — add a game by BGG ID
router.post('/', async (req, res) => {
  const { bggId } = req.body;
  if (!bggId) return res.status(400).json({ error: 'bggId is required' });

  // Check for duplicate
  const existing = db.prepare('SELECT id FROM games WHERE bgg_id = ?').get(String(bggId));
  if (existing) return res.status(409).json({ error: 'Game already in collection' });

  try {
    const g = await getBGGDetails(String(bggId));

    const stmt = db.prepare(`
      INSERT INTO games
        (bgg_id, title, year_published, min_players, max_players,
         min_playtime, max_playtime, complexity, categories, mechanics,
         description, thumbnail, image, bgg_rating)
      VALUES
        (@bggId, @title, @yearPublished, @minPlayers, @maxPlayers,
         @minPlaytime, @maxPlaytime, @complexity, @categories, @mechanics,
         @description, @thumbnail, @image, @bggRating)
    `);

    const result = stmt.run({
      ...g,
      bggId: g.bggId,
      categories: JSON.stringify(g.categories),
      mechanics: JSON.stringify(g.mechanics),
    });

    const newGame = db.prepare('SELECT * FROM games WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(parseGame(newGame));
  } catch (err) {
    console.error('Add game error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// DELETE /api/games/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Game not found' });
  res.status(204).end();
});

// GET /api/games/pick — random game picker
router.get('/pick', (req, res) => {
  const { players, maxPlaytime, maxComplexity } = req.query;

  let query = 'SELECT * FROM games WHERE 1=1';
  const params = [];

  if (players) {
    const p = parseInt(players, 10);
    if (!isNaN(p)) {
      query += ' AND min_players <= ? AND max_players >= ?';
      params.push(p, p);
    }
  }
  if (maxPlaytime) {
    const t = parseInt(maxPlaytime, 10);
    if (!isNaN(t)) {
      query += ' AND (min_playtime <= ? OR min_playtime IS NULL)';
      params.push(t);
    }
  }
  if (maxComplexity) {
    const c = parseFloat(maxComplexity);
    if (!isNaN(c)) {
      query += ' AND (complexity <= ? OR complexity IS NULL)';
      params.push(c);
    }
  }

  const games = db.prepare(query).all(...params);
  if (!games.length) return res.json(null);

  const picked = games[Math.floor(Math.random() * games.length)];
  res.json(parseGame(picked));
});

export default router;
