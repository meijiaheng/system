/**
 * 数据层工厂：有完整 Supabase 凭据就走 Supabase，否则本地 SQLite 兜底。
 * 业务层与接口层只依赖这里返回的 repo，感知不到底层差异。
 */
import { createSupabaseRepo } from './supabaseRepo.js';
import { createSqliteRepo } from './sqliteRepo.js';

const PLACEHOLDER = /你的|your|xxx|<|>/i;

function isRealValue(v) {
  return Boolean(v) && !PLACEHOLDER.test(v);
}

export async function createRepo(env = process.env) {
  const url = (env.SUPABASE_URL || '').trim();
  const key = (env.SUPABASE_ANON_KEY || env.SUPABASE_KEY || '').trim();

  if (isRealValue(url) && isRealValue(key)) {
    try {
      const repo = createSupabaseRepo(url, key);
      // 连一次真实查询，确认表存在且网络可达；失败则自动降级
      await repo.list('all');
      console.log('[db] 已连接 Supabase:', url);
      return repo;
    } catch (err) {
      console.warn('[db] Supabase 不可用，降级到本地 SQLite →', err.message);
    }
  } else {
    console.log('[db] 未配置 Supabase 凭据，使用本地 SQLite');
  }

  return createSqliteRepo(env.SQLITE_PATH || './data/tasks.db');
}
