import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

let localDb = null;
let tursoClient = null;

if (isTurso) {
  console.log('[DB] Connecting to remote Turso SQLite cloud database...');
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
} else {
  console.log('[DB] Using local SQLite database (chgk.db)...');
  const dbPath = path.join(__dirname, 'chgk.db');
  localDb = new Database(dbPath);
  localDb.pragma('journal_mode = WAL');
}

// Унифицированный метод выполнения SQL
export async function execute(sql, args = []) {
  if (isTurso) {
    return await tursoClient.execute({ sql, args });
  } else {
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA');
    if (isSelect) {
      const stmt = localDb.prepare(sql);
      const rows = stmt.all(...args);
      return {
        rows,
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      };
    } else {
      const stmt = localDb.prepare(sql);
      const info = stmt.run(...args);
      return {
        rows: [],
        lastInsertRowid: info.lastInsertRowid,
        rowsAffected: info.changes,
      };
    }
  }
}

// Инициализация таблиц
export async function initDb() {
  try {
    await execute(`
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
      )
    `);

    // Миграции для старых колонок
    const addColumn = async (colDef) => {
      try {
        await execute(`ALTER TABLE users ADD COLUMN ${colDef}`);
      } catch (e) {
        // Игнорируем ошибку, если колонка уже существует
      }
    };

    await addColumn("losses INTEGER DEFAULT 0");
    await addColumn("active_avatar TEXT DEFAULT 'avatar_boss'");
    await addColumn("active_hat TEXT");
    await addColumn("unlocked_hats TEXT DEFAULT '[]'");
    await addColumn("unlocked_owls TEXT DEFAULT '[]'");
    await addColumn("pending_awards TEXT DEFAULT '[]'");
    console.log('[DB] Database tables initialized successfully.');
  } catch (err) {
    console.error('[DB] Error initializing tables:', err);
  }
}

export async function getUserByUsername(username) {
  const result = await execute('SELECT * FROM users WHERE username = ?', [username]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function createUser(username, passwordHash) {
  return await execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, passwordHash]);
}

export async function updateUserEquipment(username, type, itemId) {
  if (type === 'avatar') {
    return await execute('UPDATE users SET active_avatar = ? WHERE username = ?', [itemId, username]);
  } else if (type === 'hat') {
    return await execute('UPDATE users SET active_hat = ? WHERE username = ?', [itemId, username]);
  }
}

export async function updateUserAwards(username, pendingAwards, unlockedOwls) {
  return await execute(
    'UPDATE users SET pending_awards = ?, unlocked_owls = ? WHERE username = ?',
    [JSON.stringify(pendingAwards), JSON.stringify(unlockedOwls), username]
  );
}

export async function updateUserStats(username, gamesPlayed, wins, losses, pendingAwards) {
  return await execute(
    'UPDATE users SET games_played = ?, wins = ?, losses = ?, pending_awards = ? WHERE username = ?',
    [gamesPlayed, wins, losses, JSON.stringify(pendingAwards), username]
  );
}

export default {
  execute,
  initDb,
  getUserByUsername,
  createUser,
  updateUserEquipment,
  updateUserAwards,
  updateUserStats,
};
