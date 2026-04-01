import { store } from './store.js';

// Claves de otros módulos (deben coincidir exactamente)
const TIMER_KEY    = 'timers_v1';
const HABITS_KEY   = 'habits_v2';
const HABIT_CFG_KEY= 'habit_cfg_v2';
const TODO_KEY     = 'todos_v1';
const CAL_KEY      = 'calendar_events_v1';
const POM_CFG_KEY  = 'pomodoro_cfg_v1';
const POM_STATE_KEY= 'pomodoro_state_v1';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function todayDay() {
  return new Date().getDate();
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días ☀️';
  if (h < 19) return 'Buenas tardes 🌤️';
  return 'Buenas noches 🌙';
}
function fmtCountdown(when) {
  const diff = new Date(when) - new Date();
  if (diff <= 0) return 'Ya pasó';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `en ${d}d ${h}h`;
  if (h > 0) return `en ${h}h ${m}m`;
  return `en ${m}m`;
}

export function initToday() {
  const section = document.getElementById('tab-today');
  if (!section) return;

  function render() {
    const iso   = todayISO();
    const ym    = todayYM();
    const day   = todayDay();
    const now   = new Date();

    // ── datos ──────────────────────────────────────────────
    const timers  = store.get(TIMER_KEY, []);
    const cfg     = store.get(HABIT_CFG_KEY, { habits: [] });
    const habData = store.get(HABITS_KEY, {});
    const todos   = store.get(TODO_KEY, []);
    let calRaw;
    try { calRaw = JSON.parse(localStorage.getItem(CAL_KEY) || '{}'); } catch { calRaw = {}; }
    const pomCfg  = store.get(POM_CFG_KEY, { workMin: 25 });
    const pomSt   = store.get(POM_STATE_KEY, { mode: 'work', running: false });

    // ── hábitos de hoy ─────────────────────────────────────
    const habitsDayData = habData[ym]?.[day] || {};
    const totalHabits   = cfg.habits.length;
    const doneHabits    = cfg.habits.filter(h => habitsDayData[h] === 1).length;
    const habitPct      = totalHabits ? Math.round(100 * doneHabits / totalHabits) : 0;

    // ── tareas ─────────────────────────────────────────────
    const pendingTodos = todos.filter(t => !t.done);
    const doneTodos    = todos.filter(t =>  t.done);

    // ── próximos temporizadores (top 3) ────────────────────
    const upcomingTimers = timers
      .filter(t => new Date(t.when) > now)
      .sort((a, b) => new Date(a.when) - new Date(b.when))
      .slice(0, 3);

    // ── eventos de hoy (calendario) ────────────────────────
    const todayEvents = (calRaw[iso] || []).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    // ── Pomodoro ────────────────────────────────────────────
    const pomLabel = pomSt.running ? '🍅 En sesión' : (pomSt.mode === 'work' ? '🍅 Listo' : '☕ Descanso');
    const pomMins  = pomCfg.workMin || 25;

    // ── hora actual animada ────────────────────────────────
    const timeStr = now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

    // ── render ─────────────────────────────────────────────
    section.innerHTML = `
      <div class="today-wrap">

        <!-- ENCABEZADO -->
        <div class="today-hero">
          <div>
            <div class="today-greeting">${greeting()}</div>
            <div class="today-date">${dateStr}</div>
          </div>
          <div class="today-clock" id="todayClock">${timeStr}</div>
        </div>

        <!-- GRID DE TARJETAS -->
        <div class="today-grid">

          <!-- HÁBITOS -->
          <div class="today-card today-card--habits">
            <div class="tc-header">
              <span class="tc-icon">🔁</span>
              <span class="tc-title">Hábitos hoy</span>
              <span class="tc-badge ${habitPct === 100 ? 'tc-badge--ok' : ''}">${doneHabits}/${totalHabits}</span>
            </div>
            <div class="tc-bar-wrap">
              <div class="tc-bar"><div class="tc-bar-fill" style="width:${habitPct}%"></div></div>
              <span class="tc-pct">${habitPct}%</span>
            </div>
            ${totalHabits === 0
              ? `<p class="tc-empty">Aún no tienes hábitos. Ve a la pestaña <strong>Hábitos</strong>.</p>`
              : `<div class="tc-habit-pills">
                  ${cfg.habits.map(h => {
                    const done = habitsDayData[h] === 1;
                    return `<span class="tc-pill ${done ? 'tc-pill--done' : 'tc-pill--pending'}">${done ? '✓' : '○'} ${h}</span>`;
                  }).join('')}
                </div>`
            }
          </div>

          <!-- TAREAS -->
          <div class="today-card today-card--tasks">
            <div class="tc-header">
              <span class="tc-icon">✅</span>
              <span class="tc-title">Tareas</span>
              <span class="tc-badge">${pendingTodos.length} pendientes</span>
            </div>
            ${pendingTodos.length === 0
              ? `<p class="tc-empty tc-empty--ok">¡Todo al día! Sin pendientes 🎉</p>`
              : `<ul class="tc-task-list">
                  ${pendingTodos.slice(0, 5).map(t => `<li class="tc-task-item"><span class="tc-dot"></span>${t.text}</li>`).join('')}
                  ${pendingTodos.length > 5 ? `<li class="tc-task-more">+${pendingTodos.length - 5} más…</li>` : ''}
                </ul>`
            }
            ${doneTodos.length > 0 ? `<div class="tc-done-count">✓ ${doneTodos.length} completada${doneTodos.length > 1 ? 's' : ''}</div>` : ''}
          </div>

          <!-- EVENTOS DEL DÍA -->
          <div class="today-card today-card--events">
            <div class="tc-header">
              <span class="tc-icon">📅</span>
              <span class="tc-title">Agenda de hoy</span>
              <span class="tc-badge">${todayEvents.length} evento${todayEvents.length !== 1 ? 's' : ''}</span>
            </div>
            ${todayEvents.length === 0
              ? `<p class="tc-empty">Sin eventos hoy. Agrega en <strong>Calendario</strong>.</p>`
              : `<ul class="tc-event-list">
                  ${todayEvents.map(ev => `
                    <li class="tc-event-item">
                      <span class="tc-event-time">${ev.time || '--:--'}</span>
                      <span class="tc-event-name">${ev.title}</span>
                    </li>`).join('')}
                </ul>`
            }
          </div>

          <!-- PRÓXIMOS TEMPORIZADORES -->
          <div class="today-card today-card--timers">
            <div class="tc-header">
              <span class="tc-icon">⏳</span>
              <span class="tc-title">Próximos eventos</span>
            </div>
            ${upcomingTimers.length === 0
              ? `<p class="tc-empty">Sin temporizadores activos.</p>`
              : `<ul class="tc-timer-list">
                  ${upcomingTimers.map(t => `
                    <li class="tc-timer-item">
                      <span class="tc-timer-name">${t.title}</span>
                      <span class="tc-timer-cd" data-when="${t.when}">${fmtCountdown(t.when)}</span>
                    </li>`).join('')}
                </ul>`
            }
          </div>

          <!-- POMODORO -->
          <div class="today-card today-card--pom">
            <div class="tc-header">
              <span class="tc-icon">🍅</span>
              <span class="tc-title">Pomodoro</span>
              <span class="tc-badge ${pomSt.running ? 'tc-badge--ok' : ''}">${pomLabel}</span>
            </div>
            <div class="tc-pom-body">
              <div class="tc-pom-mins">${pomMins}<span>min</span></div>
              <p class="tc-pom-hint">Sesión de trabajo configurada</p>
              <button class="tc-pom-btn btn" onclick="document.querySelector('[data-tab=pomodoro]').click()">
                ${pomSt.running ? 'Ver sesión activa' : 'Iniciar Pomodoro'}
              </button>
            </div>
          </div>

        </div><!-- /today-grid -->
      </div>
    `;

    // reloj en vivo
    startClock();
    // actualizar countdowns cada segundo
    startCountdowns();
  }

  let clockInterval  = null;
  let cdInterval     = null;

  function startClock() {
    clearInterval(clockInterval);
    clockInterval = setInterval(() => {
      const el = document.getElementById('todayClock');
      if (el) el.textContent = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    }, 1000);
  }

  function startCountdowns() {
    clearInterval(cdInterval);
    cdInterval = setInterval(() => {
      document.querySelectorAll('.tc-timer-cd').forEach(el => {
        el.textContent = fmtCountdown(el.dataset.when);
      });
    }, 10000);
  }

  // re-render cuando cambian datos de otros módulos
  document.addEventListener('habits:changed', render);

  // render inicial
  render();

  // refrescar al volver a la pestaña
  document.addEventListener('tab:changed', (e) => {
    if (e.detail === 'today') render();
  });
}
