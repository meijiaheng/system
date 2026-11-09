/**
 * 组装 Express 应用（本地运行与 Vercel 函数共用同一份实例）
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRepo } from './db/index.js';
import { createTaskRouter } from './routes/tasks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

export async function createApp() {
  const repo = await createRepo();

  const app = express();
  app.use(express.json());
  app.use(express.static(publicDir));

  // 元信息：页面右上角显示数据实际存放在哪
  app.get('/api/meta', (_req, res) => {
    res.json({ driver: repo.driver });
  });

  app.use('/api/tasks', createTaskRouter(repo));

  // 统一错误处理
  app.use((err, _req, res, _next) => {
    console.error('[error]', err);
    res.status(500).json({ error: '服务器内部错误' });
  });

  return { app, repo };
}
