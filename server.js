import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRepo } from './src/db/index.js';
import { createTaskRouter } from './src/routes/tasks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const repo = await createRepo();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

const server = app.listen(PORT, () => {
  console.log(`智能任务管理系统已启动：http://localhost:${PORT}  （数据层：${repo.driver}）`);
});

const shutdown = async () => {
  server.close();
  await repo.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
