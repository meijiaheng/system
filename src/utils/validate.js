/** 入参校验：标题与优先级（优先级在库中存中文「高 / 中 / 低」） */
export const PRIORITIES = ['高', '中', '低'];

export function normalizeTitle(raw) {
  const title = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
  if (!title) return { ok: false, message: '任务标题不能为空' };
  if (title.length > 120) return { ok: false, message: '任务标题不能超过 120 个字符' };
  return { ok: true, value: title };
}

export function normalizePriority(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!PRIORITIES.includes(value)) {
    return { ok: false, message: '优先级只能是 高 / 中 / 低' };
  }
  return { ok: true, value };
}

export function normalizeFilter(raw) {
  const value = typeof raw === 'string' ? raw.trim() || 'all' : 'all';
  return value === 'all' || PRIORITIES.includes(value) ? value : 'all';
}
