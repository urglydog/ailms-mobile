import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('lms_offline.db');
  await initDb(db);
  return db;
}

async function initDb(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY NOT NULL,
      material_id INTEGER NOT NULL,
      front_text TEXT NOT NULL,
      back_text TEXT NOT NULL,
      next_review_at TEXT NOT NULL,
      interval_days INTEGER NOT NULL,
      repetitions INTEGER NOT NULL,
      easiness REAL NOT NULL,
      is_due INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flashcard_sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flashcard_id INTEGER NOT NULL,
      quality INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}
