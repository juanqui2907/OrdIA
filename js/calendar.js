const CAL_KEY = 'calendar_events_v1';

function saveEvents(data){
  localStorage.setItem(CAL_KEY, JSON.stringify(data));
}
function loadEvents(){
  try {
    return JSON.parse(localStorage.getItem(CAL_KEY) || '{}');
  } catch(e) {
    return {};
  }
}
function isoDate(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function monthName(year, month){
  return new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function parseIso(iso){
  // Parse YYYY-MM-DD into a local Date (avoid UTC shift)
  const parts = String(iso).split('-').map(Number);
  if(parts.length !== 3) return new Date(iso);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Builds array of weeks (6) each with 7 day objects {date:Date,inMonth,iso}
function monthMatrix(year, month, weekStartsMonday=true){
  const first = new Date(year, month, 1);
  const firstDay = first.getDay(); // 0=Sun..6=Sat
  const shift = weekStartsMonday ? (firstDay === 0 ? 6 : firstDay - 1) : firstDay;
  const start = new Date(year, month, 1 - shift);
  const weeks = [];
  let cur = new Date(start);
  for(let w=0; w<6; w++){
    const week = [];
    for(let d=0; d<7; d++){
      week.push({
        date: new Date(cur),
        inMonth: cur.getMonth() === month,
        iso: isoDate(cur)
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function initCalendar(){
  const el = document.getElementById('tab-calendar');
  if(!el) return; // sección no encontrada

  const grid = el.querySelector('#calGrid');
  const title = el.querySelector('#calTitle');
  const prev = el.querySelector('#calPrev');
  const next = el.querySelector('#calNext');
  const todayBtn = el.querySelector('#calToday');
  const selectedLabel = el.querySelector('#calSelected');
  const eventsEl = el.querySelector('#calEvents');
  const addForm = el.querySelector('#calAddForm');
  const inputTitle = el.querySelector('#calTitleInput');
  const inputTime = el.querySelector('#calTimeInput');
  const clearDayBtn = el.querySelector('#calClearDay');

  let state = {
    date: new Date(), // current month view
    selected: isoDate(new Date()), // selected day iso
    events: loadEvents()
  };

  function render(){
    const year = state.date.getFullYear();
    const month = state.date.getMonth();
    title.textContent = monthName(year, month);

    // build grid HTML
    const weeks = monthMatrix(year, month, true);
    let html = '<div class="cal-weekdays">';
    const weekdayNames = [];
    // localized short names, starting Monday
    const baseMonday = new Date(2023,0,2); // Monday Jan 2 2023 (a known Monday)
    for(let i=0;i<7;i++){
      const d = new Date(baseMonday.getFullYear(), baseMonday.getMonth(), baseMonday.getDate() + i);
      weekdayNames.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
    }
    for(const w of weekdayNames){
      html += `<div class="cal-wd">${w}</div>`;
    }
    html += '</div>';

    html += '<div class="cal-days">';
    for(const week of weeks){
      for(const cell of week){
        const iso = cell.iso;
        const day = new Date(cell.date).getDate();
        const isToday = iso === isoDate(new Date());
        const isSelected = iso === state.selected;
        const evCount = (state.events[iso] || []).length;
        html += `<button class="cal-day ${cell.inMonth ? '' : 'cal-outside'} ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected-day' : ''}" data-iso="${iso}" aria-pressed="${isSelected}">
          <div class="cal-day-top"><span class="cal-day-num">${day}</span>${evCount ? `<span class="cal-badge">${evCount}</span>` : ''}</div>
        </button>`;
      }
    }
    html += '</div>';
    grid.innerHTML = html;

    // attach click handlers
    grid.querySelectorAll('.cal-day').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        state.selected = btn.dataset.iso;
        render(); // re-render to update selection
        renderSelected();
      });
    });

    renderSelected();
  }

  function renderSelected(){
    selectedLabel.textContent = parseIso(state.selected).toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const list = state.events[state.selected] || [];
    if(list.length === 0){
      eventsEl.innerHTML = `<div class="cal-noevents">No hay eventos</div>`;
    } else {
      eventsEl.innerHTML = list.map((ev, idx) => `
        <div class="cal-event">
          <div class="cal-event-left">
            <div class="cal-event-time">${ev.time || ''}</div>
            <div class="cal-event-title">${escapeHtml(ev.title)}</div>
          </div>
          <div class="cal-event-actions">
            <button class="btn ghost cal-del" data-idx="${idx}" data-iso="${state.selected}">Eliminar</button>
          </div>
        </div>
      `).join('');
      // attach deletes
      eventsEl.querySelectorAll('.cal-del').forEach(b=>{
        b.addEventListener('click', ()=>{
          const iso = b.dataset.iso;
          const idx = Number(b.dataset.idx);
          state.events[iso].splice(idx,1);
          if(state.events[iso].length === 0) delete state.events[iso];
          saveEvents(state.events);
          render();
        });
      });
    }
  }

  addForm.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const titleVal = inputTitle.value.trim();
    if(!titleVal) return;
    const timeVal = inputTime.value || '';
    if(!state.events[state.selected]) state.events[state.selected] = [];
    state.events[state.selected].push({ title: titleVal, time: timeVal });
    saveEvents(state.events);
    inputTitle.value = '';
    inputTime.value = '';
    render();
  });

  prev.addEventListener('click', ()=>{
    state.date.setMonth(state.date.getMonth() - 1);
    render();
  });
  next.addEventListener('click', ()=>{
    state.date.setMonth(state.date.getMonth() + 1);
    render();
  });
  todayBtn.addEventListener('click', ()=>{
    state.date = new Date();
    state.selected = isoDate(new Date());
    render();
  });

  clearDayBtn.addEventListener('click', ()=>{
    if(!confirm('Borrar todos los eventos de este día?')) return;
    delete state.events[state.selected];
    saveEvents(state.events);
    render();
  });

  // helper to escape HTML for event titles
  function escapeHtml(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // initial render: keep selected as today by default
  state.selected = state.selected || isoDate(new Date());
  render();
}
