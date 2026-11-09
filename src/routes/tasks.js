/** 任务接口路由 */
import express from 'express';
import { normalizeTitle, normalizePriority, normalizeFilter } from '../utils/validate.js';

export function createTaskRouter(repo) {
  const router = express.Router();

  // 列表：GET /api/tasks?priority=all|high|medium|low
  router.get('/', async (req, res, next) => {
    try {
      const priority = normalizeFilter(req.query.priority);
      const tasks = await repo.list(priority);
      res.json({ data: tasks });
    } catch (err) {
      next(err);
    }
  });

  // 新增：POST /api/tasks  { title, priority }
  router.post('/', async (req, res, next) => {
    try {
      const t = normalizeTitle(req.body?.title);
      if (!t.ok) return res.status(400).json({ error: t.message });

      const p = normalizePriority(req.body?.priority);
      if (!p.ok) return res.status(400).json({ error: p.message });

      const task = await repo.create({ title: t.value, priority: p.value });
      res.status(201).json({ data: task });
    } catch (err) {
      next(err);
    }
  });

  // 切换完成状态：PATCH /api/tasks/:id  { completed?: boolean }
  // 不传 completed 视为"取反"
  router.patch('/:id', async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const current = await repo.get(id);
      if (!current) return res.status(404).json({ error: '任务不存在' });

      const completed = typeof req.body?.completed === 'boolean' ? req.body.completed : !current.completed;
      const updated = await repo.toggle(id, completed);
      if (!updated) return res.status(404).json({ error: '任务不存在' });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  });

  // 删除：DELETE /api/tasks/:id
  router.delete('/:id', async (req, res, next) => {
    try {
      const ok = await repo.remove(String(req.params.id));
      if (!ok) return res.status(404).json({ error: '任务不存在' });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
