import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database;

export async function initDB() {
  db = await open({
    filename: process.env.DB_PATH || './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone_number TEXT UNIQUE,
      username TEXT,
      avatar TEXT,
      public_key TEXT,
      bio TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS otps (
      phone_number TEXT PRIMARY KEY,
      otp TEXT,
      expires_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT, -- 'private', 'group', 'community', 'channel'
      created_by TEXT,
      created_at INTEGER,
      parent_id TEXT -- For channels causing to a community
    );

    -- Migration for existing dbs
    -- try { await db.exec('ALTER TABLE rooms ADD COLUMN parent_id TEXT'); } catch (e) {}



    CREATE TABLE IF NOT EXISTS members(
      room_id TEXT,
      user_id TEXT,
      joined_at INTEGER,
      PRIMARY KEY(room_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages(
      id TEXT PRIMARY KEY,
      conversationId TEXT, --maps to room_id
      senderId TEXT,
      content TEXT,
      timestamp INTEGER,
      type TEXT,
      status TEXT,
      reactions TEXT, --JSON string
      fileName TEXT,
      fileSize INTEGER,
      duration INTEGER,
      replyToId TEXT
    );

    CREATE TABLE IF NOT EXISTS statuses(
      id TEXT PRIMARY KEY,
      userId TEXT,
      type TEXT, -- 'text' | 'image' | 'video'
      content TEXT, --Text body or URL
      caption TEXT,
      background TEXT, --For text status
      timestamp INTEGER,
      expiresAt INTEGER
    );
  `);

  try {
    await db.exec('ALTER TABLE rooms ADD COLUMN parent_id TEXT');
    console.log('Migrated rooms table: added parent_id');
  } catch (e) {
    // Column likely exists
  }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN bio TEXT');
    console.log('Migrated users table: added bio');
  } catch (e) { }

  console.log('Database initialized');
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}
