import { store } from './store.js';

// Migrar datos de v1 a v2 si existen
const TODO_KEY = 'todos_v1'; // volver a v1 para no perder datos del usuario

const PRIORITY_ORDER = { alta: 0, media: 1, normal: 2, baja: 3 };
const PRIORITY_LABEL = { alta: '🔴 Alta', media: '🟡 Media', normal: 'Normal', baja: '🟢 Baja' };
const PRIORITY_CLASS = { alta: 'prio-alta', media: 'prio-media', normal: 'prio-normal', baja: 'prio-baja' };

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDeadline(iso) {
  if (!iso) return null;
  const today = todayISO();
  const d = new Date(iso + 'T00:00:00');
  const label = d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  if (iso < today)   return { label: `⚠️ ${label}`, cls: 'deadline-overdue' };
  if (iso === today) return { label: `📌 Hoy`,       cls: 'deadline-today' };
  return              { label: `📅 ${label}`,        cls: 'deadline-future' };
}

export function initTodo() {
  let todos  = store.get(TODO_KEY, []);
  let filter = 'all';
  let sortBy = 'created';

  const todoText     = document.getElementById('todoText');
  const todoPriority = document.getElementById('todoPriority');
  const todoDeadline = document.getElementById('todoDeadline');
  const addTodoBtn   = document.getElementById('addTodo');
  const todoList     = document.getElementById('todoList');
  const clearDone    = document.getElementById('clearDone');
  const clearAll     = document.getElementById('clearAll');
  const todoSort     = document.getElementById('todoSort');
  const filterBtns   = document.querySelectorAll('.todo-filter-btn');

  function save() {
    store.set(TODO_KEY, todos);
    document.dispatchEvent(new CustomEvent('todo:changed'));
  }

  function syncAll() {
    // Sincronizar con calendario y temporizadores
    const CAL_KEY   = 'calendar_events_v1';
    const TIMER_KEY = 'timers_v1';

    let cal;
    try { cal = JSON.parse(localStorage.getItem(CAL_KEY) || '{}'); } catch { cal = {}; }

    let timers;
    try { timers = JSON.parse(localStorage.getItem(TIMER_KEY) || '[]'); } catch { timers = []; }

    // Limpiar entradas previas de Do It
    for (const iso of Object.keys(cal)) {
      cal[iso] = cal[iso].filter(e => !e.fromTodo);
      if (!cal[iso].length) delete cal[iso];
    }
    timers = timers.filter(t => !t.todoId);

    // Reinsertar tareas con deadline
    for (const t of todos) {
      if (!t.deadline) continue;
      const iso = t.deadline;
      if (!cal[iso]) cal[iso] = [];
      cal[iso].push({ title: `✅ ${t.text}`, time: '', fromTodo: true, todoId: t.id, done: t.done });
      timers.push({ id: t.id, todoId: t.id, title: `✅ ${t.text}`, when: `${t.deadline}T23:59` });
    }

    localStorage.setItem(CAL_KEY, JSON.stringify(cal));
    localStorage.setItem(TIMER_KEY, JSON.stringify(timers));
    document.dispatchEvent(new CustomEvent('calendar:refresh'));
    document.dispatchEvent(new CustomEvent('timers:changed'));
  }

  function getFiltered() {
    let list = [...todos];
    if (filter === 'pending') list = list.filter(t => !t.done);
    if (filter === 'done')    list = list.filter(t =>  t.done);
    if (sortBy === 'priority') {
      list.sort((a, b) => (PRIORITY_ORDER[a.priority]||2) - (PRIORITY_ORDER[b.priority]||2));
    } else if (sortBy === 'deadline') {
      list.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
    }
    return list;
  }

  function renderTodos() {
    todoList.innerHTML = '';
    const list = getFiltered();
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'status';
      li.textContent = filter === 'done'    ? 'Sin tareas completadas.' :
                       filter === 'pending' ? '¡Todo al día! Sin pendientes.' :
                       'No hay tareas. Añade la primera.';
      todoList.appendChild(li);
      return;
    }
    list.forEach(t => {
      const dl = fmtDeadline(t.deadline);
      const prioClass = PRIORITY_CLASS[t.priority] || 'prio-normal';
      const li = document.createElement('li');
      li.className = 'todo-item' + (t.done ? ' done' : '') + ' ' + prioClass;
      li.innerHTML = `
        <input type="checkbox" ${t.done ? 'checked' : ''} aria-label="Completar" />
        <div class="todo-body">
          <span class="todo-text">${t.text}</span>
          <div class="todo-meta">
            ${t.priority && t.priority !== 'normal'
              ? `<span class="todo-prio-tag todo-prio-${t.priority}">${PRIORITY_LABEL[t.priority]}</span>`
              : ''}
            ${dl ? `<span class="todo-deadline ${dl.cls}">${dl.label}</span>` : ''}
            ${t.deadline ? `<span class="todo-cal-tag">📆 en calendario</span>` : ''}
          </div>
        </div>
        <button class="btn ghost todo-del" aria-label="Eliminar">✕</button>
      `;
      li.querySelector('input[type=checkbox]').addEventListener('change', (e) => {
        const idx = todos.findIndex(x => x.id === t.id);
        if (idx !== -1) todos[idx].done = e.target.checked;
        save(); syncAll(); renderTodos();
      });
      li.querySelector('.todo-del').addEventListener('click', () => {
        todos = todos.filter(x => x.id !== t.id);
        save(); syncAll(); renderTodos();
      });
      todoList.appendChild(li);
    });
  }

  addTodoBtn.addEventListener('click', () => {
    const text = todoText.value.trim();
    if (!text) return;
    todos.push({
      id: crypto.randomUUID(),
      text,
      done: false,
      priority: todoPriority?.value || 'normal',
      deadline: todoDeadline?.value || null,
      createdAt: Date.now()
    });
    save(); syncAll();
    todoText.value = '';
    if (todoDeadline) todoDeadline.value = '';
    if (todoPriority) todoPriority.value = 'normal';
    renderTodos();
  });

  todoText.addEventListener('keydown', e => { if (e.key === 'Enter') addTodoBtn.click(); });

  clearDone.addEventListener('click', () => {
    todos = todos.filter(t => !t.done);
    save(); syncAll(); renderTodos();
  });

  clearAll.addEventListener('click', () => {
    if (!confirm('¿Borrar todas las tareas?')) return;
    todos = []; save(); syncAll(); renderTodos();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      renderTodos();
    });
  });

  todoSort?.addEventListener('change', () => { sortBy = todoSort.value; renderTodos(); });

  // Sync inicial
  syncAll();
  renderTodos();
}
