/**
 * 数据访问层 · 本地 SQLite 实现（Node 22 内置 node:sqlite，零额外依赖）
 *
 * 表结构与 Supabase 侧完全对齐，仅做类型适配：
 *   bigint 自增 id -> integer primary key autoincrement
 *   boolean -> integer(0/1)
 *   timestamptz -> text(ISO 字符串)
 *   priority 在两侧都存中文「高 / 中 / 低」
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function createSqliteRepo(dbPath) {
  const dir = path.dirname(dbPath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new DatabaseSync(dbPath);

  db.exec(`
    create table if not exists tasks (
      id         integer primary key autoincrement,
      title      text not null,
      priority   text not null,
      completed  integer not null default 0,
      created_at text not null
    );
    create index if not exists tasks_created_at_idx on tasks (created_at desc);
  `);

  const mapRow = (row) => ({
    id: Number(row.id),
    title: row.title,
    priority: row.priority,
    completed: row.completed === 1,
    created_at: row.created_at,
  });

  const listStmt = db.prepare(
    `select id, title, priority, completed, created_at
       from tasks where priority = ?
      order by created_at desc, id desc`
  );
  const listAllStmt = db.prepare(
    `select id, title, priority, completed, created_at
       from tasks order by created_at desc, id desc`
  );
  const insertStmt = db.prepare(
    `insert into tasks (title, priority, completed, created_at) values (?, ?, 0, ?)`
  );
  const getStmt = db.prepare('select id, title, priority, completed, created_at from tasks where id = ?');
  const updateStmt = db.prepare('update tasks set completed = ? where id = ?');
  const deleteStmt = db.prepare('delete from tasks where id = ?');

  return {
    driver: 'sqlite',

    async list(priority = 'all') {
      const rows = priority === 'all' ? listAllStmt.all() : listStmt.all(priority);
      return rows.map(mapRow);
    },

    async get(id) {
      const row = getStmt.get(Number(id));
      return row ? mapRow(row) : null;
    },

    async create({ title, priority }) {
      const createdAt = new Date().toISOString();
      const res = insertStmt.run(title, priority, createdAt);
      const row = getStmt.get(Number(res.lastInsertRowid));
      return mapRow(row);
    },

    async toggle(id, completed) {
      updateStmt.run(completed ? 1 : 0, Number(id));
      const row = getStmt.get(Number(id));
      return row ? mapRow(row) : null;
    },

    async remove(id) {
      const res = deleteStmt.run(Number(id));
      return res.changes === 1;
    },

    async close() {
      db.close();
    },
  };
}
