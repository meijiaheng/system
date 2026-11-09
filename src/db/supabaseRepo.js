/**
 * 数据访问层 · Supabase 实现（通过 supabase-js 走 REST API 访问 tasks 表）
 *
 * 与 sqliteRepo 保持完全一致的数据契约：
 *   { id: number(bigint), title: string, priority: '高'|'中'|'低',
 *     completed: boolean, created_at: string(ISO) }
 */
import { createClient } from '@supabase/supabase-js';

const TABLE = 'tasks';

export function createSupabaseRepo(url, key) {
  const client = createClient(url, key, {
    auth: { persistSession: false },
  });

  /** 统一把数据库列转成对外字段，布尔值归一化 */
  const mapRow = (row) => ({
    id: Number(row.id),
    title: row.title,
    priority: row.priority,
    completed: Boolean(row.completed),
    created_at: row.created_at,
  });

  return {
    driver: 'supabase',

    async list(priority = 'all') {
      let query = client
        .from(TABLE)
        .select('id, title, priority, completed, created_at')
        .order('created_at', { ascending: false });

      if (priority !== 'all') query = query.eq('priority', priority);

      const { data, error } = await query;
      if (error) throw new Error(`[supabase] 查询失败: ${error.message}`);
      return (data || []).map(mapRow);
    },

    async create({ title, priority }) {
      const { data, error } = await client
        .from(TABLE)
        .insert({ title, priority })
        .select('id, title, priority, completed, created_at')
        .single();

      if (error) throw new Error(`[supabase] 新增失败: ${error.message}`);
      return mapRow(data);
    },

    async get(id) {
      const { data, error } = await client
        .from(TABLE)
        .select('id, title, priority, completed, created_at')
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(`[supabase] 查询单条失败: ${error.message}`);
      return data ? mapRow(data) : null;
    },

    async toggle(id, completed) {
      const { data, error } = await client
        .from(TABLE)
        .update({ completed })
        .eq('id', id)
        .select('id, title, priority, completed, created_at')
        .maybeSingle();

      if (error) throw new Error(`[supabase] 更新失败: ${error.message}`);
      return data ? mapRow(data) : null;
    },

    async remove(id) {
      const { error, count } = await client
        .from(TABLE)
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) throw new Error(`[supabase] 删除失败: ${error.message}`);
      return count === 1;
    },

    async close() {
      // supabase-js 无需主动断开
    },
  };
}
