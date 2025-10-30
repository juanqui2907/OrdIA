import { store } from './store.js';

const HABITS_KEY  = 'habits_v2';
const HABIT_CFG_KEY = 'habit_cfg_v2';

function daysInMonth(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Date(y,m,0).getDate();
}

// lee cfg+data y devuelve lista de hábitos fusionando cfg.habits + claves en data[ym][día]
function getHabitListFromStore(){
  const cfg = store.get(HABIT_CFG_KEY, { month:new Date().toISOString().slice(0,7), habits:[] });
  const data = store.get(HABITS_KEY, {});
  const ym   = cfg.month;

  const fromCfg = Array.isArray(cfg.habits) ? cfg.habits : [];
  const fromData = new Set();
  const days = data?.[ym] ? Object.keys(data[ym]) : [];
  if (days.length){
    const d = days[0];
    Object.keys(data[ym][d] || {}).forEach(h => fromData.add(h));
  }
  const merged = Array.from(new Set([ ...fromCfg, ...fromData ])).filter(Boolean);
  return { cfg, data, ym, habits: merged };
}

export function initProgress(){
  const sel   = document.getElementById('progressHabitSel');
  const chart = document.getElementById('progressChart');
  const ctx   = chart.getContext('2d');
  const metaTotal  = document.getElementById('metaTotal');
  const metaPct    = document.getElementById('metaPct');
  const metaStreak = document.getElementById('metaStreak');

  // mes de Hábitos (existe aunque estés en otra pestaña)
  const habitsMonthPicker = document.getElementById('monthPicker');
  // nuevo: mes local de Progreso
  const progressMonthPicker = document.getElementById('progressMonth');

  // helper: establece el mes en el store y sincroniza ambos inputs
  function setMonth(ym){
    const cfg = store.get(HABIT_CFG_KEY, { month:ym, habits:[] });
    cfg.month = ym;
    store.set(HABIT_CFG_KEY, cfg);

    if (habitsMonthPicker) habitsMonthPicker.value = ym;
    if (progressMonthPicker) progressMonthPicker.value = ym;

    // avisa a quien escuche (Hábitos/Progreso)
    document.dispatchEvent(new CustomEvent('habits:month'));
  }

  function getMonth(){
    // prioridad: input de Progreso si tiene valor, si no, cfg.month
    const cfg = store.get(HABIT_CFG_KEY, { month:new Date().toISOString().slice(0,7), habits:[] });
    return progressMonthPicker?.value || cfg.month;
  }

  function drawEmptyChart(msg){
    const W = chart.width, H = chart.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(msg, W/2, H/2);
    metaTotal.textContent = '0';
    metaPct.textContent   = '0%';
    metaStreak.textContent= '0';
  }

  function fillOptions(){
    const { cfg, habits } = getHabitListFromStore();

    // sincroniza el input local con el mes actual
    if (progressMonthPicker && !progressMonthPicker.value) {
      progressMonthPicker.value = cfg.month;
    }

    sel.innerHTML = '';
    if (!habits.length){
      const opt = document.createElement('option');
      opt.textContent = '— No hay hábitos —';
      opt.disabled = true; opt.selected = true;
      sel.appendChild(opt);
      drawEmptyChart('Añade un hábito en la pestaña “Hábitos”.');
      return;
    }
    habits.forEach((h,i)=>{
      const opt = document.createElement('option');
      opt.value = h; opt.textContent = h;
      if (i===0) opt.selected = true;
      sel.appendChild(opt);
    });

    // si cfg.habits estaba vacío pero hay hábitos en data, sincroniza cfg
    if ((!cfg.habits || !cfg.habits.length) && habits.length){
      cfg.habits = habits;
      store.set(HABIT_CFG_KEY, cfg);
    }

    drawProgress();
  }

  function drawProgress(){
    const { cfg, data } = getHabitListFromStore();
    const ym = getMonth() || cfg.month;

    if (!sel.options.length || sel.options[0].disabled){
      drawEmptyChart('Añade un hábito en la pestaña “Hábitos”.');
      return;
    }

    const h = sel.value || sel.options[0].value;
    const days = daysInMonth(ym);
    const series = [];
    let acc = 0, curStreak = 0;

    for (let d=1; d<=days; d++){
      const v = (data?.[ym]?.[d]?.[h]) ? 1 : 0;
      acc += v; series.push(acc);
      curStreak = v ? curStreak+1 : 0;
    }

    metaTotal.textContent = acc;
    metaPct.textContent   = Math.round(100 * acc / days) + '%';
    metaStreak.textContent= curStreak;

    const W = chart.width, H = chart.height;
    ctx.clearRect(0,0,W,H);

    // ejes
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40,20); ctx.lineTo(40,H-30); ctx.lineTo(W-10,H-30); ctx.stroke();

    const maxY = Math.max(1, acc, Math.ceil(days*0.4));
    const steps = Math.max(3, Math.min(6, maxY));
    ctx.fillStyle = '#6b7280'; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
    for(let i=0;i<=steps;i++){
      const yVal = Math.round(maxY*i/steps);
      const y = bottomMapY(yVal, maxY, H);
      ctx.fillText(String(yVal), 8, y+4);
      ctx.beginPath(); ctx.moveTo(40,y); ctx.lineTo(W-10,y); ctx.stroke();
    }

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#9d4edd';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.forEach((v,idx)=>{
      const x = mapX(idx+1, days, W);
      const y = bottomMapY(v, maxY, H);
      if(idx===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

    ctx.fillStyle = '#7a2bd7';
    series.forEach((v,idx)=>{
      const x = mapX(idx+1, days, W), y = bottomMapY(v, maxY, H);
      ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill();
    });

    function mapX(day,totalDays,width){
      const left=40, right=width-10;
      return left + (right-left)*(day-1)/(totalDays-1 || 1);
    }
    function bottomMapY(val,maxVal,height){
      const top=20, bottom=height-30;
      return bottom - (bottom-top)*(val/(maxVal||1));
    }
  }

  // eventos
  sel.addEventListener('change', drawProgress);

  // cuando cambies el mes desde Progreso, actualizamos store y el picker de Hábitos
  progressMonthPicker?.addEventListener('change', (e)=>{
    const ym = e.target.value;
    if (ym) setMonth(ym);
    fillOptions();
  });

  // si cambias el mes desde Hábitos, sincroniza el input de Progreso
  document.addEventListener('habits:month', ()=>{
    const cfg = store.get(HABIT_CFG_KEY, { month:new Date().toISOString().slice(0,7), habits:[] });
    if (progressMonthPicker) progressMonthPicker.value = cfg.month;
    fillOptions();
  });

  // refrescos típicos
  document.addEventListener('habits:changed', fillOptions);
  document.addEventListener('habits:data',    drawProgress);

  const progressBtn = document.querySelector('.tab-btn[data-tab="progress"]');
  progressBtn?.addEventListener('click', fillOptions);

  // init
  const cfg = store.get(HABIT_CFG_KEY, { month:new Date().toISOString().slice(0,7), habits:[] });
  if (progressMonthPicker) progressMonthPicker.value = cfg.month;
  fillOptions();
}
