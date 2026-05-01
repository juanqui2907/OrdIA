import { store } from './store.js';

const HABITS_KEY = 'habits_v2';
const HABIT_CFG_KEY = 'habit_cfg_v2';

function daysInMonth(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Date(y,m,0).getDate();
}

// Une nombres de hábitos desde cfg.habits y lo que encuentre en data[month]
function getHabitListFromStore(){
  const cfg = store.get(HABIT_CFG_KEY, { month:new Date().toISOString().slice(0,7), habits:[] });
  const data = store.get(HABITS_KEY, {});
  const ym   = cfg.month;

  const fromCfg = Array.isArray(cfg.habits) ? cfg.habits : [];

  const fromData = new Set();
  const days = data?.[ym] ? Object.keys(data[ym]) : [];
  if (days.length){
    // toma el primer día que tenga registros y extrae sus claves (nombres de hábitos)
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
  const monthPicker = document.getElementById('monthPicker'); // vive en Hábitos (pero está en el DOM)

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

    // Si cfg.habits estaba vacío pero detectamos hábitos en data, sincroniza cfg
    if ((!cfg.habits || !cfg.habits.length) && habits.length){
      cfg.habits = habits;
      store.set(HABIT_CFG_KEY, cfg);
    }

    drawProgress();
  }

  function resizeCanvas(){
    const container = chart.parentElement;
    const w = Math.min(520, container.clientWidth - 8);
    const h = Math.round(w * (300/520));
    if (chart.width !== w || chart.height !== h){
      chart.width  = w;
      chart.height = h;
    }
  }

  function drawProgress(){
    resizeCanvas();
    const { cfg, data } = getHabitListFromStore();
    const ym = monthPicker?.value || cfg.month;

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
      const y = mapY(yVal, maxY, H);
      ctx.fillText(String(yVal), 8, y+4);
      ctx.beginPath(); ctx.moveTo(40,y); ctx.lineTo(W-10,y); ctx.stroke();
    }

    // línea
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#9d4edd';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.forEach((v,idx)=>{
      const x = mapX(idx+1, days, W);
      const y = mapY(v, maxY, H);
      if(idx===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

    // puntos
    ctx.fillStyle = '#7a2bd7';
    series.forEach((v,idx)=>{
      const x = mapX(idx+1, days, W), y = mapY(v, maxY, H);
      ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill();
    });

    function mapX(day,totalDays,width){
      const left=40, right=width-10;
      return left + (right-left)*(day-1)/(totalDays-1 || 1);
    }
    function mapY(val,maxVal,height){
      const top=20, bottom=height-30;
      return bottom - (bottom-top)*(val/(maxVal||1));
    }
  }

  sel.addEventListener('change', drawProgress);

  // Refresca cuando cambian cosas en Hábitos
  document.addEventListener('habits:changed', fillOptions);
  document.addEventListener('habits:month',   ()=>{ fillOptions(); });
  document.addEventListener('habits:data',    drawProgress);
  document.addEventListener('tab:changed', e => {
    if (e.detail === 'progress') { resizeCanvas(); drawProgress(); }
  });
  window.addEventListener('resize', () => { if (document.getElementById('tab-progress').classList.contains('active')) drawProgress(); });

  // Refresca al activar la pestaña Progreso (por si abriste directo allí)
  const progressBtn = document.querySelector('.tab-btn[data-tab="progress"]');
  progressBtn?.addEventListener('click', fillOptions);

  // Init
  fillOptions();
}
