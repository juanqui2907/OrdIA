// Puente entre Do It y Calendario
// Los eventos de tareas se guardan en el mismo store del calendario
// con la clave especial: { title, time:'', fromTodo: true, todoId }

const CAL_KEY = 'calendar_events_v1';

function loadCal() {
  try { return JSON.parse(localStorage.getItem(CAL_KEY) || '{}'); } catch { return {}; }
}
function saveCal(data) {
  localStorage.setItem(CAL_KEY, JSON.stringify(data));
}

export function syncTodoToCalendar(todo) {
  // Añade o actualiza el evento del calendario para esta tarea
  if (!todo.deadline) return;
  const cal = loadCal();
  const iso = todo.deadline;
  if (!cal[iso]) cal[iso] = [];
  // evitar duplicados
  const exists = cal[iso].findIndex(e => e.todoId === todo.id);
  const entry = {
    title: `✅ ${todo.text}`,
    time: '',
    fromTodo: true,
    todoId: todo.id,
    done: todo.done
  };
  if (exists >= 0) {
    cal[iso][exists] = entry;
  } else {
    cal[iso].push(entry);
  }
  saveCal(cal);
  // avisar al calendario para que se re-renderice si está activo
  document.dispatchEvent(new CustomEvent('calendar:refresh'));
}

export function removeTodoFromCalendar(todoId, deadline) {
  if (!deadline) return;
  const cal = loadCal();
  const iso = deadline;
  if (!cal[iso]) return;
  cal[iso] = cal[iso].filter(e => e.todoId !== todoId);
  if (cal[iso].length === 0) delete cal[iso];
  saveCal(cal);
  document.dispatchEvent(new CustomEvent('calendar:refresh'));
}

export function updateAllTodosInCalendar(todos) {
  // Limpia todos los eventos fromTodo y los recrea desde cero
  const cal = loadCal();
  // borrar todos los fromTodo existentes
  for (const iso of Object.keys(cal)) {
    cal[iso] = cal[iso].filter(e => !e.fromTodo);
    if (cal[iso].length === 0) delete cal[iso];
  }
  // reinsertar los que tienen deadline
  for (const t of todos) {
    if (!t.deadline) continue;
    const iso = t.deadline;
    if (!cal[iso]) cal[iso] = [];
    cal[iso].push({
      title: `✅ ${t.text}`,
      time: '',
      fromTodo: true,
      todoId: t.id,
      done: t.done
    });
  }
  saveCal(cal);
  document.dispatchEvent(new CustomEvent('calendar:refresh'));
}
