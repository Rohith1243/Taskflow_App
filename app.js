/**
 * TaskFlow — app.js
 * Task Management Application
 * Features: Auth, CRUD, Real-time simulation, Responsive
 */

/* ============================================================
   STORAGE KEYS & STATE
   ============================================================ */
const USERS_KEY   = 'tf_users';
const SESSION_KEY = 'tf_session';
const TASKS_KEY   = 'tf_tasks';

let currentUser  = null;
let tasks        = [];
let currentView  = 'all';
let currentFilter = 'all';
let editingId    = null;

/* ============================================================
   UTILITY HELPERS
   ============================================================ */

/** Generate a random short UID */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Escape HTML special characters to prevent XSS */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Format ISO date string as dd/mm/yy */
function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y.slice(2)}`;
}

/** Get today's ISO date string (YYYY-MM-DD) */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/* ============================================================
   PERSISTENCE — localStorage helpers
   ============================================================ */

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  catch { return []; }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getTasks() {
  try {
    return JSON.parse(
      localStorage.getItem(`${TASKS_KEY}-${currentUser?.email}`) || '[]'
    );
  } catch { return []; }
}

function saveTasks() {
  localStorage.setItem(
    `${TASKS_KEY}-${currentUser.email}`,
    JSON.stringify(tasks)
  );
}

/* ============================================================
   AUTHENTICATION
   ============================================================ */

function switchTab(tab) {
  const tabs  = document.querySelectorAll('.auth-tab');
  const login = document.getElementById('login-form');
  const reg   = document.getElementById('register-form');
  const err   = document.getElementById('auth-err');

  if (tab === 'login') {
    tabs[0].classList.add('active');
    tabs[1].classList.remove('active');
    login.style.display = 'block';
    reg.style.display   = 'none';
  } else {
    tabs[1].classList.add('active');
    tabs[0].classList.remove('active');
    reg.style.display   = 'block';
    login.style.display = 'none';
  }
  err.style.display = 'none';
}

function showAuthError(msg) {
  const err = document.getElementById('auth-err');
  err.textContent  = msg;
  err.style.display = 'block';
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;

  if (!email || !pass) {
    showAuthError('Please fill in all fields.');
    return;
  }

  const users = getUsers();
  let user = users.find(u => u.email === email && u.pass === pass);

  // Seed demo account on first use
  if (!user && email === 'demo@taskflow.app' && pass === 'demo123') {
    user = { email, name: 'Demo User', pass, role: 'Member' };
    if (!users.find(u => u.email === email)) {
      users.push(user);
      saveUsers(users);
    }
  }

  if (!user) {
    showAuthError('Invalid email or password.');
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  startApp(user);
}

function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;

  if (!name || !email || !pass) {
    showAuthError('All fields are required.');
    return;
  }
  if (pass.length < 6) {
    showAuthError('Password must be at least 6 characters.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAuthError('Please enter a valid email address.');
    return;
  }

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    showAuthError('An account with this email already exists.');
    return;
  }

  const user = { email, name, pass, role: 'Member' };
  users.push(user);
  saveUsers(users);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  startApp(user);
}

function doLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  currentUser = null;
  tasks = [];
  document.getElementById('app-screen').style.display  = 'none';
  document.getElementById('auth-screen').style.display = 'block';
  stopRealtimeSimulation();
}

/* ============================================================
   APP BOOTSTRAP
   ============================================================ */

function startApp(user) {
  currentUser = user;

  // Update UI with user info
  document.getElementById('user-display').textContent = user.name;
  document.getElementById('user-avatar').textContent  = user.name.charAt(0).toUpperCase();

  // Show app, hide auth
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'block';

  // Load tasks (seed if empty)
  tasks = getTasks();
  if (tasks.length === 0) seedDemoTasks();

  renderTasks();
  updateStats();
  updateBadges();
  startRealtimeSimulation();
}

/** Seed realistic demo tasks for new users */
function seedDemoTasks() {
  const d = offset => {
    const dt = new Date();
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split('T')[0];
  };

  tasks = [
    {
      id: uid(), title: 'Review quarterly report',
      desc: 'Go through Q3 numbers and prepare a concise summary for the leadership meeting.',
      status: 'inprogress', priority: 'high', cat: 'Work',
      due: d(1), created: Date.now() - 500000
    },
    {
      id: uid(), title: 'Design new landing page',
      desc: 'Create wireframes and hi-fi mockups for the marketing site redesign.',
      status: 'todo', priority: 'med', cat: 'Work',
      due: d(3), created: Date.now() - 400000
    },
    {
      id: uid(), title: 'Grocery shopping',
      desc: 'Milk, eggs, bread, vegetables, coffee beans.',
      status: 'todo', priority: 'low', cat: 'Personal',
      due: d(0), created: Date.now() - 300000
    },
    {
      id: uid(), title: 'Fix production bug #423',
      desc: 'Users cannot upload images larger than 2 MB. Investigate S3 policy and CORS config.',
      status: 'inprogress', priority: 'high', cat: 'Urgent',
      due: d(-1), created: Date.now() - 200000
    },
    {
      id: uid(), title: 'Write unit tests for auth module',
      desc: 'Cover login, registration, token refresh, and logout flows.',
      status: 'done', priority: 'med', cat: 'Work',
      due: d(-2), created: Date.now() - 100000
    },
    {
      id: uid(), title: 'Read "Atomic Habits"',
      desc: 'Finish chapters 8 and 9 before the book club meeting on Friday.',
      status: 'todo', priority: 'low', cat: 'Personal',
      due: d(7), created: Date.now() - 50000
    },
  ];
  saveTasks();
}

/* ============================================================
   NAVIGATION VIEWS
   ============================================================ */

function setView(view, event) {
  currentView = view;

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.remove('active')
  );
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }

  // Update page title
  const titles = {
    all:          'All tasks',
    today:        'Due today',
    inprogress:   'In progress',
    done:         'Completed',
    'cat-Work':   'Work',
    'cat-Personal': 'Personal',
    'cat-Urgent': 'Urgent',
  };
  document.getElementById('view-title').textContent = titles[view] || view;

  closeSidebar();
  renderTasks();
}

/* ============================================================
   FILTERING & SORTING
   ============================================================ */

function setFilter(filter, el) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderTasks();
}

function getFilteredAndSortedTasks() {
  const today = todayStr();
  const q     = (document.getElementById('search-input')?.value || '').toLowerCase();

  // 1. Apply view filter
  let list = tasks.filter(t => {
    if (q && !t.title.toLowerCase().includes(q) &&
        !(t.desc || '').toLowerCase().includes(q)) return false;

    switch (currentView) {
      case 'today':      return t.due === today;
      case 'inprogress': return t.status === 'inprogress';
      case 'done':       return t.status === 'done';
      default:
        if (currentView.startsWith('cat-')) {
          return t.cat === currentView.slice(4);
        }
        return true; // 'all'
    }
  });

  // 2. Apply status/priority filter
  if (currentFilter !== 'all') {
    if (currentFilter === 'high') {
      list = list.filter(t => t.priority === 'high');
    } else {
      list = list.filter(t => t.status === currentFilter);
    }
  }

  // 3. Sort
  const sort     = document.getElementById('sort-sel')?.value || 'created';
  const pOrder   = { high: 0, med: 1, low: 2 };

  list.sort((a, b) => {
    switch (sort) {
      case 'created':  return b.created - a.created;
      case 'due':      return (a.due || '9999').localeCompare(b.due || '9999');
      case 'priority': return pOrder[a.priority] - pOrder[b.priority];
      case 'title':    return a.title.localeCompare(b.title);
      default:         return 0;
    }
  });

  return list;
}

/* ============================================================
   RENDER
   ============================================================ */

function renderTasks() {
  const area = document.getElementById('task-area');
  const list = getFilteredAndSortedTasks();

  if (!list.length) {
    area.innerHTML = `
      <div class="empty-state">
        <div class="empty-ico">📋</div>
        <p style="font-size:15px;font-weight:500;margin-bottom:6px">No tasks found</p>
        <p style="font-size:13px;color:var(--text2)">
          ${currentFilter !== 'all' || currentView !== 'all'
            ? 'Try adjusting your filters'
            : 'Click "New task" to get started'}
        </p>
      </div>`;
    updateStats();
    updateBadges();
    return;
  }

  // Group by status
  const groups = {
    todo:       list.filter(t => t.status === 'todo'),
    inprogress: list.filter(t => t.status === 'inprogress'),
    done:       list.filter(t => t.status === 'done'),
  };

  let html = '';

  if (groups.todo.length) {
    html += sectionHeader(`To do`, groups.todo.length);
    html += groups.todo.map(buildTaskCard).join('');
  }
  if (groups.inprogress.length) {
    html += sectionHeader(`In progress`, groups.inprogress.length);
    html += groups.inprogress.map(buildTaskCard).join('');
  }
  if (groups.done.length) {
    html += sectionHeader(`Completed`, groups.done.length);
    html += groups.done.map(buildTaskCard).join('');
  }

  area.innerHTML = html;
  updateStats();
  updateBadges();
}

function sectionHeader(label, count) {
  return `
    <div class="section-head">
      <span>${esc(label)} (${count})</span>
      <span class="section-line"></span>
    </div>`;
}

function buildTaskCard(t) {
  const today   = todayStr();
  const overdue = t.due && t.due < today && t.status !== 'done';
  const checked = t.status === 'done';
  const prioLabels = { high: 'High', med: 'Medium', low: 'Low' };

  return `
    <div class="task-card${checked ? ' done' : ''}" id="tc-${t.id}">
      <button class="check-btn${checked ? ' checked' : ''}"
              onclick="toggleDone('${t.id}', event)"
              title="${checked ? 'Mark incomplete' : 'Mark complete'}">
      </button>
      <div class="task-body">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-meta">
          <span class="tag prio-${t.priority}">${prioLabels[t.priority]}</span>
          <span class="tag cat">${esc(t.cat)}</span>
          ${t.due
            ? `<span class="tag ${overdue ? 'overdue' : 'due'}">
                ${overdue ? 'Overdue · ' : ''}${fmtDate(t.due)}
               </span>`
            : ''}
          ${t.desc
            ? `<span class="task-desc">${esc(t.desc.slice(0, 60))}${t.desc.length > 60 ? '…' : ''}</span>`
            : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="act-btn" onclick="openModal('${t.id}', event)">Edit</button>
        <button class="act-btn del" onclick="deleteTask('${t.id}', event)">Delete</button>
      </div>
    </div>`;
}

/* ============================================================
   STATS & BADGES
   ============================================================ */

function updateStats() {
  const today = todayStr();
  document.getElementById('st-total').textContent = tasks.length;
  document.getElementById('st-done').textContent  = tasks.filter(t => t.status === 'done').length;
  document.getElementById('st-prog').textContent  = tasks.filter(t => t.status === 'inprogress').length;
  document.getElementById('st-over').textContent  = tasks.filter(
    t => t.due && t.due < today && t.status !== 'done'
  ).length;
}

function updateBadges() {
  const today      = todayStr();
  const totalOpen  = tasks.filter(t => t.status !== 'done').length;
  const todayCount = tasks.filter(t => t.due === today && t.status !== 'done').length;

  document.getElementById('badge-all').textContent = totalOpen;

  const todayBadge = document.getElementById('badge-today');
  todayBadge.textContent   = todayCount;
  todayBadge.style.display = todayCount > 0 ? 'inline' : 'none';
}

/* ============================================================
   CRUD OPERATIONS
   ============================================================ */

/** Toggle task completion status */
function toggleDone(id, e) {
  e.stopPropagation();
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.status = task.status === 'done' ? 'todo' : 'done';
  saveTasks();
  renderTasks();
  toast(task.status === 'done' ? 'Task completed ✓' : 'Task reopened', 'green');
}

/** Delete a task by id */
function deleteTask(id, e) {
  e.stopPropagation();
  if (!confirm('Delete this task?')) return;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  toast('Task deleted', 'red');
}

/* ============================================================
   MODAL — Create / Edit
   ============================================================ */

function openModal(id, e) {
  if (e) e.stopPropagation();
  editingId = id || null;

  document.getElementById('modal-title').textContent = id ? 'Edit task' : 'New task';

  if (id) {
    // Populate with existing task data
    const t = tasks.find(x => x.id === id);
    if (t) {
      document.getElementById('f-title').value    = t.title;
      document.getElementById('f-desc').value     = t.desc || '';
      document.getElementById('f-status').value   = t.status;
      document.getElementById('f-priority').value = t.priority;
      document.getElementById('f-cat').value      = t.cat;
      document.getElementById('f-due').value      = t.due || '';
    }
  } else {
    // Reset form
    document.getElementById('f-title').value    = '';
    document.getElementById('f-desc').value     = '';
    document.getElementById('f-status').value   = 'todo';
    document.getElementById('f-priority').value = 'med';
    document.getElementById('f-cat').value      = 'Work';
    document.getElementById('f-due').value      = '';
  }

  document.getElementById('modal-backdrop').classList.add('open');
  setTimeout(() => document.getElementById('f-title').focus(), 200);
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  editingId = null;
}

function handleBackdropClick(e) {
  if (e.target === document.getElementById('modal-backdrop')) closeModal();
}

function saveTask() {
  const title    = document.getElementById('f-title').value.trim();
  const desc     = document.getElementById('f-desc').value.trim();
  const status   = document.getElementById('f-status').value;
  const priority = document.getElementById('f-priority').value;
  const cat      = document.getElementById('f-cat').value;
  const due      = document.getElementById('f-due').value || null;

  if (!title) {
    toast('Title is required', 'red');
    document.getElementById('f-title').focus();
    return;
  }

  if (editingId) {
    // UPDATE existing task
    const task = tasks.find(t => t.id === editingId);
    if (task) {
      Object.assign(task, { title, desc, status, priority, cat, due, updated: Date.now() });
    }
    toast('Task updated', 'blue');
  } else {
    // CREATE new task
    tasks.unshift({
      id: uid(),
      title, desc, status, priority, cat, due,
      created: Date.now(),
      updated: null,
    });
    toast('Task created ✓', 'green');
  }

  saveTasks();
  closeModal();
  renderTasks();
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

let toastTimer = null;

function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast show ${type}`.trim();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ============================================================
   SIDEBAR (mobile)
   ============================================================ */

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

/* ============================================================
   REAL-TIME SIMULATION
   Simulates WebSocket-style updates from teammates.
   In production, replace with actual WebSocket / SSE / polling.
   ============================================================ */

let realtimeTimer = null;

function startRealtimeSimulation() {
  const simulateUpdate = () => {
    if (!currentUser || tasks.length === 0) return;

    const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
    const statuses   = ['todo', 'inprogress', 'done'];
    const newStatus  = statuses[Math.floor(Math.random() * statuses.length)];

    if (randomTask.status !== newStatus) {
      randomTask.status = newStatus;
      saveTasks();
      renderTasks();
      toast('🔄 Task updated by a teammate', 'blue');
    }

    scheduleNextUpdate();
  };

  const scheduleNextUpdate = () => {
    const delay = 20000 + Math.random() * 25000; // 20–45 seconds
    realtimeTimer = setTimeout(simulateUpdate, delay);
  };

  scheduleNextUpdate();
}

function stopRealtimeSimulation() {
  if (realtimeTimer) {
    clearTimeout(realtimeTimer);
    realtimeTimer = null;
  }
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */

document.addEventListener('keydown', e => {
  // Escape closes modal
  if (e.key === 'Escape') closeModal();

  // Ctrl/Cmd + K focuses search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('search-input')?.focus();
  }

  // Ctrl/Cmd + N opens new task modal
  if ((e.ctrlKey || e.metaKey) && e.key === 'n' && currentUser) {
    e.preventDefault();
    openModal();
  }
});

// Enter key on login password
document.getElementById('login-pass')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

/* ============================================================
   INIT — Auto-restore session on page load
   ============================================================ */

(function init() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const user = JSON.parse(saved);
      startApp(user);
      return;
    }
  } catch { /* ignore */ }

  // Show auth screen
  document.getElementById('auth-screen').style.display = 'block';
})();
