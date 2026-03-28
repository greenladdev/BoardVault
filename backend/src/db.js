import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || 'boardvault.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    bgg_id       INTEGER UNIQUE,
    title        TEXT NOT NULL,
    year_published INTEGER,
    min_players  INTEGER,
    max_players  INTEGER,
    min_playtime INTEGER,
    max_playtime INTEGER,
    complexity   REAL,
    categories   TEXT DEFAULT '[]',
    mechanics    TEXT DEFAULT '[]',
    description  TEXT,
    thumbnail    TEXT,
    image        TEXT,
    bgg_rating   REAL,
    added_at     DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
