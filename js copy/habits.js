import { store } from './store.js';

export const HABITS_KEY='habits_v2';
export const HABIT_CFG_KEY='habit_cfg_v2'; // {month:"YYYY-MM", habits:[...]}

function daysInMonth(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Date(y,m,0).getDate();
}
function ensureMonth(data, cfg, ym){
  if(!data[ym]) data[ym]={};
  const days = daysInMonth(ym);
  for(let d=1; d<=days; d++){
    if(!data[ym][d]) data[ym][d]={};
    cfg.habits.forEach(h=>{ if(data[ym][d][h]===undefined) data[ym][d][h]=0 })
  }
  return data;
}

export function initHabits(){
  const monthPicker = document.getElementById('monthPicker');
  const habitTable = document.getElementById('habitTable');
  const addHabitBtn = document.getElementById('addHabitBtn');
  const clearMonthBtn = document.getElementById('clearMonthBtn');
  const habitStats = document.getElementById('habitStats');

  const today = new Date();
  const initMonth = today.toISOString().slice(0,7);
  const cfg = store.get(HABIT_CFG_KEY, {month:initMonth, habits:['Cepillarme','Dibujo','CAP','Música']});
  let data = store.get(HABITS_KEY, {}); // { "YYYY-MM": {[day]: {[habit]: 0/1}} }

  monthPicker.value = cfg.month;

  function renderStats(){
    const ym = monthPicker.value;
    const days = daysInMonth(ym);
    const totals = {};
    cfg.habits.forEach(h=>totals[h]=0);
    for(let d=1; d<=days; d++){
      cfg.habits.forEach(h=> totals[h]+=data[ym][d][h]||0 );
    }
    habitStats.innerHTML='';
    cfg.habits.forEach(h=>{
      const pct = Math.round(100*totals[h]/days);
      const item = document.createElement('div');
      item.className='stat';
      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
          <span>${h}</span>
          <span style="display:flex;gap:8px;align-items:center">
            <span class="pill">${totals[h]}/${days}</span>
            <button class="btn danger" data-del-habit="${h}" style="padding:4px 8px">🗑️</button>
          </span>
        </div>
        <div class="bar"><i style="width:${pct}%"></i></div>
      `;
      habitStats.appendChild(item);
    });

    // eliminar hábito desde el chip de basura
    habitStats.onclick = (ev)=>{
      const btn = ev.target.closest('[data-del-habit]');
      if(!btn) return;
      const h = btn.getAttribute('data-del-habit');
      if (!confirm(`¿Eliminar el hábito "${h}" de todos los meses?`)) return;

      cfg.habits = cfg.habits.filter(x=>x!==h);
      store.set(HABIT_CFG_KEY, cfg);

      Object.keys(data).forEach(ym=>{
        Object.keys(data[ym]||{}).forEach(d=>{
          if (data[ym][d] && h in data[ym][d]) delete data[ym][d][h];
        });
      });
      store.set(HABITS_KEY, data);

      renderHabitTable();
      document.dispatchEvent(new CustomEvent('habits:changed'));
    };
  }

  function renderHabitTable(){
    const ym = monthPicker.value;
    data = ensureMonth(data, cfg, ym);
    store.set(HABITS_KEY,data);

    // head
    let thead = `<thead><tr><th class="day-col">Día</th>`;
    cfg.habits.forEach(h=> thead += `<th>${h}</th>`);
    thead += `<th>Hábitos</th></tr></thead>`;
    // body
    let tbody = '<tbody>';
    const days = daysInMonth(ym);
    for(let d=1; d<=days; d++){
      tbody += `<tr><td class="day-col">${d}</td>`;
      let rowSum = 0;
      cfg.habits.forEach(h=>{
        const v = data[ym][d][h]||0; rowSum += v;
        const cls = v? 'cell-done' : '';
        tbody += `<td class="${cls}">
          <input type="checkbox" data-day="${d}" data-habit="${h}" ${v?'checked':''} />
        </td>`;
      })
      const color = rowSum ? '#fff7cc' : '#fff';
      tbody += `<td style="background:${color}">${rowSum}</td></tr>`;
    }
    tbody += '</tbody>';
    habitTable.innerHTML = thead + tbody;

    // listeners
    habitTable.querySelectorAll('input[type=checkbox]').forEach(cb=>{
      cb.addEventListener('change', e=>{
        const day = Number(e.target.dataset.day);
        const h = e.target.dataset.habit;
        data[ym][day][h] = e.target.checked ? 1 : 0;
        store.set(HABITS_KEY,data);
        renderStats();
        const td = e.target.closest('td');
        td.classList.toggle('cell-done', e.target.checked);
        document.dispatchEvent(new CustomEvent('habits:data'));
      })
    })
    renderStats();
    document.dispatchEvent(new CustomEvent('habits:changed'));
  }

  addHabitBtn.addEventListener('click', ()=>{
    const name = prompt('Nombre del nuevo hábito:');
    if(!name) return;
    cfg.habits.push(name.trim());
    store.set(HABIT_CFG_KEY,cfg);
    data = ensureMonth(data, cfg, monthPicker.value);
    store.set(HABITS_KEY,data);
    renderHabitTable();
  });

  clearMonthBtn.addEventListener('click', ()=>{
    const ym = monthPicker.value;
    if(!confirm('¿Limpiar todos los checks de este mes?')) return;
    const days = daysInMonth(ym);
    for(let d=1; d<=days; d++){
      cfg.habits.forEach(h=> data[ym][d][h]=0);
    }
    store.set(HABITS_KEY,data);
    renderHabitTable();
  });

  monthPicker.addEventListener('change', ()=>{
    cfg.month = monthPicker.value;
    store.set(HABIT_CFG_KEY,cfg);
    data = ensureMonth(data, cfg, cfg.month);
    renderHabitTable();
    document.dispatchEvent(new CustomEvent('habits:month'));
  });

  // init defaults si no hay hábitos
  (function ensureDefaultHabits(){
    if (!Array.isArray(cfg.habits) || cfg.habits.length === 0) {
      cfg.habits = ['Hábito 1'];
      store.set(HABIT_CFG_KEY, cfg);
      data = ensureMonth(data, cfg, monthPicker.value);
      store.set(HABITS_KEY,data);
    } else {
      data = ensureMonth(data, cfg, monthPicker.value);
      store.set(HABITS_KEY,data);
    }
  })();

  renderHabitTable();
}
