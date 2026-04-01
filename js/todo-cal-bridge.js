// Puente entre Do It, Calendario y Temporizadores
const CAL_KEY   = 'calendar_events_v1';
const TIMER_KEY = 'timers_v1';

function loadCal() {
  try { return JSON.parse(localStorage.getItem(CAL_KEY) || '{}'); } catch { return {}; }
}
function saveCal(data) { localStorage.setItem(CAL_KEY, JSON.stringify(data)); }

function loadTimers() {
  try { return JSON.parse(localStorage.getItem(TIMER_KEY) || '[]'); } catch { return []; }
}
function saveTimers(data) { localStorage.setItem(TIMER_KEY, JSON.stringify(data)); }

function notify(events) {
  for (const ev of events) document.dispatchEvent(new CustomEvent(ev));
}

// ── Calendario ──────────────────────────────────────────────
function upsertCalEvent(cal, iso, todo) {
  if (!cal[iso]) cal[iso] = [];
  const i = cal[iso].findIndex(e => e.todoId === todo.id);
  const entry = { title: `✅ ${todo.text}`, time: '', fromTodo: true, todoId: todo.id, done: todo.done };
  if (i >= 0) cal[iso][i] = entry; else cal[iso].push(entry);
}

// ── Temporizadores ───────────────────────────────────────────
function isoToDatetimeLocal(iso) {
  // deadline es YYYY-MM-DD → ponerlo a las 23:59 de ese día
  return `${iso}T23:59`;
}
function upsertTimer(timers, todo) {
  const i = timers.findIndex(t => t.todoId === todo.id);
  const entry = { id: todo.id, todoId: todo.id, title: `✅ ${todo.text}`, when: isoToDatetimeLocal(todo.deadline) };
  if (i >= 0) timers[i] = entry; else timers.push(entry);
}

// ── Sync individual ──────────────────────────────────────────
export function syncTodoToCalendar(todo) {
  if (!todo.deadline) return;
  const cal = loadCal();
  upsertCalEvent(cal, todo.deadline, todo);
  saveCal(cal);

  const timers = loadTimers();
  upsertTimer(timers, todo);
  saveTimers(timers);

  notify(['calendar:refresh', 'timers:changed']);
}

export function removeTodoFromCalendar(todoId, deadline) {
  if (!deadline) return;

  const cal = loadCal();
  if (cal[deadline]) {
    cal[deadline] = cal[deadline].filter(e => e.todoId !== todoId);
    if (!cal[deadline].length) delete cal[deadline];
    saveCal(cal);
  }

  const timers = loadTimers().filter(t => t.todoId !== todoId);
  saveTimers(timers);

  notify(['calendar:refresh', 'timers:changed']);
}

// ── Sync total al iniciar ────────────────────────────────────
export function updateAllTodosInCalendar(todos) {
  const cal = loadCal();
  // limpiar todos los fromTodo
  for (const iso of Object.keys(cal)) {
    cal[iso] = cal[iso].filter(e => !e.fromTodo);
    if (!cal[iso].length) delete cal[iso];
  }
  // limpiar timers de tareas
  const timers = loadTimers().filter(t => !t.todoId);

  for (const t of todos) {
    if (!t.deadline) continue;
    upsertCalEvent(cal, t.deadline, t);
    upsertTimer(timers, t);
  }
  saveCal(cal);
  saveTimers(timers);
  notify(['calendar:refresh', 'timers:changed']);
}
