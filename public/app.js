/* 智能任务管理系统 · 前端交互 */

const state = {
  tasks: [],
  filter: 'all',
  loading: false,
};

const el = {
  form: document.getElementById('add-form'),
  title: document.getElementById('title-input'),
  priority: document.getElementById('priority-select'),
  tip: document.getElementById('form-tip'),
  list: document.getElementById('task-list'),
  empty: document.getElementById('empty'),
  filters: document.getElementById('filters'),
  summary: document.getElementById('summary'),
  driver: document.getElementById('driver'),
};

const PRIORITY_LABEL = { 高: '高', 中: '中', 低: '低' };
const PRIORITY_CLASS = { 高: 'high', 中: 'medium', 低: 'low' };

/* ---------- 工具 ---------- */
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `请求失败（${res.status}）`);
  return body;
}

function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `今天 ${hm}`;
  const yesterday = new Date(now.getTime() - 86400000);
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${hm}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`;
}

function showTip(message) {
  el.tip.textContent = message;
}

/* ---------- 渲染 ---------- */
function render() {
  const list = el.list;
  list.innerHTML = '';

  el.empty.hidden = state.tasks.length > 0;

  for (const task of state.tasks) {
    const li = document.createElement('li');
    li.className = `task${task.completed ? ' completed' : ''}`;

    // 完成 / 未完成 切换按钮
    const toggle = document.createElement('button');
    toggle.className = `toggle${task.completed ? ' done' : ''}`;
    toggle.type = 'button';
    toggle.textContent = '✓';
    toggle.title = task.completed ? '点击标记为未完成' : '点击标记为已完成';
    toggle.setAttribute('aria-label', task.completed ? '标记为未完成' : '标记为已完成');
    toggle.addEventListener('click', () => toggleTask(task));

    const main = document.createElement('div');
    main.className = 'task-main';

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    const badge = document.createElement('span');
    badge.className = `badge ${PRIORITY_CLASS[task.priority] || 'medium'}`;
    badge.textContent = `${PRIORITY_LABEL[task.priority] || task.priority}优先级`;

    const status = document.createElement('span');
    status.className = 'status-text';
    status.textContent = task.completed ? '已完成' : '未完成';

    const time = document.createElement('span');
    time.textContent = formatTime(task.created_at);

    meta.append(badge, status, time);
    main.append(title, meta);

    const del = document.createElement('button');
    del.className = 'btn-delete';
    del.type = 'button';
    del.textContent = '删除';
    del.addEventListener('click', () => deleteTask(task));

    li.append(toggle, main, del);
    list.append(li);
  }

  // 统计
  const done = state.tasks.filter((t) => t.completed).length;
  el.summary.textContent = state.tasks.length
    ? `共 ${state.tasks.length} 条 · 已完成 ${done} 条`
    : '';
}

function updateCounts(allTasks) {
  const counts = { all: allTasks.length, 高: 0, 中: 0, 低: 0 };
  allTasks.forEach((t) => { counts[t.priority] = (counts[t.priority] || 0) + 1; });
  Object.entries(counts).forEach(([key, value]) => {
    const node = document.getElementById(`count-${key}`);
    if (node) node.textContent = value;
  });
}

/* ---------- 数据操作 ---------- */
async function loadTasks() {
  const query = state.filter === 'all' ? '' : `?priority=${encodeURIComponent(state.filter)}`;
  const { data } = await api(`/api/tasks${query}`);
  state.tasks = data;

  // 「全部」筛选时本身就是全量数据，直接用它统计；否则另取一次全量做角标计数
  updateCounts(state.filter === 'all' ? data : (await api('/api/tasks')).data);
  render();
}

async function toggleTask(task) {
  try {
    await api(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !task.completed }),
    });
    await loadTasks();
  } catch (err) {
    showTip(err.message);
  }
}

async function deleteTask(task) {
  try {
    await api(`/api/tasks/${task.id}`, { method: 'DELETE' });
    await loadTasks();
  } catch (err) {
    showTip(err.message);
  }
}

/* ---------- 事件 ---------- */
el.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = el.title.value.trim();
  if (!title) {
    showTip('任务标题不能为空');
    return;
  }

  const btn = el.form.querySelector('.btn-primary');
  btn.disabled = true;
  showTip('');

  try {
    await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, priority: el.priority.value }),
    });
    el.title.value = '';
    el.title.focus();
    await loadTasks();
  } catch (err) {
    showTip(err.message);
  } finally {
    btn.disabled = false;
  }
});

el.filters.addEventListener('click', async (e) => {
  const btn = e.target.closest('.filter');
  if (!btn) return;
  const filter = btn.dataset.filter;
  if (filter === state.filter) return;

  state.filter = filter;
  el.filters.querySelectorAll('.filter').forEach((b) => {
    b.classList.toggle('active', b === btn);
  });

  try {
    await loadTasks();
  } catch (err) {
    showTip(err.message);
  }
});

/* ---------- 启动 ---------- */
(async function init() {
  try {
    const meta = await api('/api/meta');
    el.driver.textContent = meta.driver === 'supabase' ? '数据源：Supabase' : '数据源：本地 SQLite';
  } catch {
    el.driver.textContent = '数据源：未知';
  }

  try {
    await loadTasks();
  } catch (err) {
    showTip(err.message);
  }
})();
