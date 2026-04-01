import { store } from './store.js';
import { syncTodoToCalendar, removeTodoFromCalendar, updateAllTodosInCalendar } from './todo-cal-bridge.js';

const TODO_KEY = 'todos_v2';

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

  // Sincronizar estado inicial con calendario
  updateAllTodosInCalendar(todos);

  const todoText     = document.getElementById('todoText');
  const todoPriority = document.getElementById('todoPriority');
  const todoDeadline = document.getElementById('todoDeadline');
  const addTodoBtn   = document.getElementById('addTodo');
  const todoList     = document.getElementById('todoList');
  const clearDone    = document.getElementById('clearDone');
  const clearAll     = document.getElementById('clearAll');
  const todoSort     = document.getElementById('todoSort');
  const filterBtns   = document.querySelectorAll('.todo-filter-btn');

  function save() { store.set(TODO_KEY, todos); }

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
      const cb = li.querySelector('input[type=checkbox]');
      cb.addEventListener('change', () => {
        const idx = todos.findIndex(x => x.id === t.id);
        if (idx !== -1) {
          todos[idx].done = cb.checked;
          save();
          syncTodoToCalendar(todos[idx]); // actualizar en calendario
        }
        renderTodos();
      });
      li.querySelector('.todo-del').addEventListener('click', () => {
        removeTodoFromCalendar(t.id, t.deadline); // borrar del calendario
        todos = todos.filter(x => x.id !== t.id);
        save();
        renderTodos();
      });
      todoList.appendChild(li);
    });
  }

  addTodoBtn.addEventListener('click', () => {
    const text = todoText.value.trim();
    if (!text) return;
    const newTodo = {
      id: crypto.randomUUID(),
      text,
      done: false,
      priority: todoPriority?.value || 'normal',
      deadline: todoDeadline?.value || null,
      createdAt: Date.now()
    };
    todos.push(newTodo);
    save();
    syncTodoToCalendar(newTodo); // añadir al calendario si tiene fecha
    todoText.value = '';
    if (todoDeadline) todoDeadline.value = '';
    if (todoPriority) todoPriority.value = 'normal';
    renderTodos();
  });

  todoText.addEventListener('keydown', e => { if (e.key === 'Enter') addTodoBtn.click(); });

  clearDone.addEventListener('click', () => {
    const done = todos.filter(t => t.done);
    done.forEach(t => removeTodoFromCalendar(t.id, t.deadline));
    todos = todos.filter(t => !t.done);
    save(); renderTodos();
  });

  clearAll.addEventListener('click', () => {
    if (!confirm('¿Borrar todas las tareas?')) return;
    todos.forEach(t => removeTodoFromCalendar(t.id, t.deadline));
    todos = []; save(); renderTodos();
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

  renderTodos();
}
