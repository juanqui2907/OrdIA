import { store } from './store.js';

const HABITS_KEY='habits_v2';
const HABIT_CFG_KEY='habit_cfg_v2';

function daysInMonth(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Date(y,m,0).getDate();
}

export function initProgress(){
  const progressHabitSel = document.getElementById('progressHabitSel');
  const progressChart = document.getElementById('progressChart');
  const ctx = progressChart.getContext('2d');
  const metaTotal = document.getElementById('metaTotal');
  const metaPct = document.getElementById('metaPct');
  const metaStreak = document.getElementById('metaStreak');
  const monthPicker = document.getElementById('monthPicker');

  function drawEmptyChart(msg){
    const W = progressChart.width, H = progressChart.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(msg, W/2, H/2);
  }

  function fillProgressHabitOptions(){
    const cfg = store.get(HABIT_CFG_KEY, {month:new Date().toISOString().slice(0,7), habits:[]});
    progressHabitSel.innerHTML = '';
    if (!Array.isArray(cfg.habits) || cfg.habits.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = '— No hay hábitos —';
      opt.disabled = true; opt.selected = true;
      progressHabitSel.appendChild(opt);
      drawEmptyChart('Añade un hábito en la pestaña “Hábitos”.');
      metaTotal.textContent = '0'; metaPct.textContent = '0%'; metaStreak.textContent = '0';
      return;
    }
    cfg.habits.forEach((h,i)=>{
      const opt = document.createElement('option');
      opt.value = h; opt.textContent = h;
      if (i===0) opt.selected = true;
      progressHabitSel.appendChild(opt);
    });
    drawProgress();
  }

  function drawProgress(){
    const cfg = store.get(HABIT_CFG_KEY, {month:new Date().toISOString().slice(0,7), habits:[]});
    const data = store.get(HABITS_KEY, {});
    const ym = monthPicker.value || cfg.month;

    // seguridad
    if (!cfg.habits || cfg.habits.length === 0) {
      fillProgressHabitOptions();
      return;
    }

    const h = progressHabitSel.value || cfg.habits[0];
    const days = daysInMonth(ym);
    const series = [];
    let acc = 0, curStreak = 0;

    for (let d=1; d<=days; d++){
      const v = (data?.[ym]?.[d]?.[h]) ? 1 : 0;
      acc += v; series.push(acc);
      curStreak = v ? curStreak+1 : 0;
    }

    metaTotal.textContent = acc;
    metaPct.textContent = Math.round(100 * acc / days) + '%';
    metaStreak.textContent = curStreak;

    const W = progressChart.width, H = progressChart.height;
    ctx.clearRect(0,0,W,H);
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

    const compStyles = getComputedStyle(document.documentElement);
    const accent = compStyles.getPropertyValue('--accent').trim() || '#9d4edd';

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.forEach((v,idx)=>{
      const x = mapX(idx+1, days, W);
      const y = mapY(v, maxY, H);
      if(idx===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

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

  progressHabitSel.addEventListener('change', drawProgress);

  // reaccionar a cambios en la pestaña de hábitos
  document.addEventListener('habits:changed', fillProgressHabitOptions);
  document.addEventListener('habits:month', drawProgress);
  document.addEventListener('habits:data', drawProgress);

  // init
  fillProgressHabitOptions();
}
