/**
 * SQLite database for simple-agent
 *
 * Simplified from NanoClaw - single agent, no groups
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_DIR = path.join(__dirname, '..', 'store');

let db: Database.Database;

export interface ScheduledTask {
  id: string;
  prompt: string;
  schedule_type: 'once' | 'cron' | 'interval';
  schedule_value: string;
  next_run: string | null;
  last_run: string | null;
  last_result: string | null;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  thread_ts: string | null;
  sender: string;
  sender_name: string;
  content: string;
  timestamp: string;
  is_from_me: boolean;
}

function createSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      key TEXT PRIMARY KEY,
      session_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      thread_ts TEXT,
      sender TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      is_from_me INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(channel_id, thread_ts);

    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      schedule_type TEXT NOT NULL,
      schedule_value TEXT NOT NULL,
      next_run TEXT,
      last_run TEXT,
      last_result TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_next_run ON scheduled_tasks(next_run);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON scheduled_tasks(status);
  `);
}

export function initDatabase(): void {
  const dbPath = path.join(STORE_DIR, 'agent.db');
  fs.mkdirSync(STORE_DIR, { recursive: true });
  db = new Database(dbPath);
  createSchema(db);
}

// --- Session management ---

export function getSession(): string | undefined {
  const row = db
    .prepare('SELECT session_id FROM sessions WHERE key = ?')
    .get('main') as { session_id: string } | undefined;
  return row?.session_id;
}

export function saveSession(sessionId: string): void {
  db.prepare(
    'INSERT OR REPLACE INTO sessions (key, session_id) VALUES (?, ?)'
  ).run('main', sessionId);
}

// --- Message storage ---

export function storeMessage(msg: Message): void {
  db.prepare(`
    INSERT OR REPLACE INTO messages
    (id, channel_id, thread_ts, sender, sender_name, content, timestamp, is_from_me)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    msg.id,
    msg.channel_id,
    msg.thread_ts,
    msg.sender,
    msg.sender_name,
    msg.content,
    msg.timestamp,
    msg.is_from_me ? 1 : 0
  );
}

export function getRecentMessages(channelId: string, limit: number = 50): Message[] {
  return db
    .prepare(`
      SELECT * FROM messages
      WHERE channel_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `)
    .all(channelId, limit) as Message[];
}

// --- Scheduled tasks ---

export function createTask(task: Omit<ScheduledTask, 'last_run' | 'last_result'>): void {
  db.prepare(`
    INSERT INTO scheduled_tasks
    (id, prompt, schedule_type, schedule_value, next_run, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.id,
    task.prompt,
    task.schedule_type,
    task.schedule_value,
    task.next_run,
    task.status,
    task.created_at
  );
}

export function getTaskById(id: string): ScheduledTask | undefined {
  return db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as
    | ScheduledTask
    | undefined;
}

export function getAllTasks(): ScheduledTask[] {
  return db
    .prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC')
    .all() as ScheduledTask[];
}

export function getDueTasks(): ScheduledTask[] {
  const now = new Date().toISOString();
  return db
    .prepare(`
      SELECT * FROM scheduled_tasks
      WHERE status = 'active' AND next_run IS NOT NULL AND next_run <= ?
      ORDER BY next_run
    `)
    .all(now) as ScheduledTask[];
}

export function updateTask(
  id: string,
  updates: Partial<Pick<ScheduledTask, 'prompt' | 'schedule_type' | 'schedule_value' | 'next_run' | 'status'>>
): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.prompt !== undefined) {
    fields.push('prompt = ?');
    values.push(updates.prompt);
  }
  if (updates.schedule_type !== undefined) {
    fields.push('schedule_type = ?');
    values.push(updates.schedule_type);
  }
  if (updates.schedule_value !== undefined) {
    fields.push('schedule_value = ?');
    values.push(updates.schedule_value);
  }
  if (updates.next_run !== undefined) {
    fields.push('next_run = ?');
    values.push(updates.next_run);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  if (fields.length === 0) return;

  values.push(id);
  db.prepare(`UPDATE scheduled_tasks SET ${fields.join(', ')} WHERE id = ?`).run(
    ...values
  );
}

export function updateTaskAfterRun(
  id: string,
  nextRun: string | null,
  lastResult: string
): void {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE scheduled_tasks
    SET next_run = ?, last_run = ?, last_result = ?,
        status = CASE WHEN ? IS NULL THEN 'completed' ELSE status END
    WHERE id = ?
  `).run(nextRun, now, lastResult, nextRun, id);
}

export function deleteTask(id: string): void {
  db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id);
}
