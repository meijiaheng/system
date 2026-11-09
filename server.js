import 'dotenv/config';
import { createApp } from './src/app.js';

const PORT = Number(process.env.PORT || 3000);
const { app, repo } = await createApp();

// Vercel 的 Node 运行时直接拿导出的 Express 应用当函数处理；
// 本地运行时才真正监听端口。
export default app;

if (!process.env.VERCEL) {
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
}
