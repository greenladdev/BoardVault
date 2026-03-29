import { Router } from 'express';
import db from '../db.js';
import { getBGGDetails } from '../services/bgg.js';

const router = Router();

// GET /api/games — list all games
router.get('/', async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM games ORDER BY title ASC');
  res.json(rows);
});

// POST /api/games — add a game by BGG ID
router.post('/', async (req, res) => {
  const { bggId } = req.body;
  if (!bggId) return res.status(400).json({ error: 'bggId is required' });

  const existing = await db.query('SELECT id FROM games WHERE bgg_id = $1', [String(bggId)]);
  if (existing.rows.length) return res.status(409).json({ error: 'Game already in collection' });

  try {
    const g = await getBGGDetails(String(bggId));

    const { rows } = await db.query(`
      INSERT INTO games
        (bgg_id, title, year_published, min_players, max_players,
         min_playtime, max_playtime, complexity, categories, mechanics,
         description, thumbnail, image, bgg_rating)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      g.bggId, g.title, g.yearPublished, g.minPlayers, g.maxPlayers,
      g.minPlaytime, g.maxPlaytime, g.complexity,
      JSON.stringify(g.categories), JSON.stringify(g.mechanics),
      g.description, g.thumbnail, g.image, g.bggRating,
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Add game error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// DELETE /api/games/:id
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM games WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Game not found' });
  res.status(204).end();
});

// GET /api/games/pick — random game picker
router.get('/pick', async (req, res) => {
  const { players, maxPlaytime, maxComplexity } = req.query;

  let query = 'SELECT * FROM games WHERE 1=1';
  const params = [];

  if (players) {
    const p = parseInt(players, 10);
    if (!isNaN(p)) {
      query += ` AND min_players <= $${params.length + 1} AND max_players >= $${params.length + 2}`;
      params.push(p, p);
    }
  }
  if (maxPlaytime) {
    const t = parseInt(maxPlaytime, 10);
    if (!isNaN(t)) {
      query += ` AND (min_playtime <= $${params.length + 1} OR min_playtime IS NULL)`;
      params.push(t);
    }
  }
  if (maxComplexity) {
    const c = parseFloat(maxComplexity);
    if (!isNaN(c)) {
      query += ` AND (complexity <= $${params.length + 1} OR complexity IS NULL)`;
      params.push(c);
    }
  }

  const { rows } = await db.query(query, params);
  if (!rows.length) return res.json(null);

  const picked = rows[Math.floor(Math.random() * rows.length)];
  res.json(picked);
});

export default router;
