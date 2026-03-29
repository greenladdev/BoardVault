import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS games (
    id              SERIAL PRIMARY KEY,
    bgg_id          TEXT UNIQUE,
    title           TEXT NOT NULL,
    year_published  INTEGER,
    min_players     INTEGER,
    max_players     INTEGER,
    min_playtime    INTEGER,
    max_playtime    INTEGER,
    complexity      DOUBLE PRECISION,
    categories      JSONB NOT NULL DEFAULT '[]',
    mechanics       JSONB NOT NULL DEFAULT '[]',
    description     TEXT,
    thumbnail       TEXT,
    image           TEXT,
    bgg_rating      DOUBLE PRECISION,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

export default pool;
