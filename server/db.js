import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'chgk.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Инициализация таблиц
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    penalties INTEGER DEFAULT 0,
    active_avatar TEXT DEFAULT 'avatar_boss',
    active_hat TEXT,
    unlocked_hats TEXT DEFAULT '[]',
    unlocked_owls TEXT DEFAULT '[]',
    pending_awards TEXT DEFAULT '[]'
  );
`);

// Миграция для старых баз (добавление новых колонок, если их нет)
const addColumn = (colDef) => {
  try {
    db.exec(`ALTER TABLE users ADD COLUMN ${colDef}`);
  } catch (e) {
    // Игнорируем ошибку, если колонка уже существует (ошибка "duplicate column name")
  }
};

addColumn("losses INTEGER DEFAULT 0");
addColumn("active_avatar TEXT DEFAULT 'avatar_boss'");
addColumn("active_hat TEXT");
addColumn("unlocked_hats TEXT DEFAULT '[]'");
addColumn("unlocked_owls TEXT DEFAULT '[]'");
addColumn("pending_awards TEXT DEFAULT '[]'");

export default db;
