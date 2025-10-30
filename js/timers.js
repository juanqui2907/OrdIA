import { store } from './store.js';

const TIMER_KEY = 'timers_v1';

function fmtDate(dtStr){
  const dt = new Date(dtStr);
  return dt.toLocaleString();
}
function pad(n){ return String(n).padStart(2,'0') }
function getParts(target){
  const now = new Date();
  const t = new Date(target) - now;
  const past = t<=0;
  const ms = Math.abs(t);
  const d = Math.floor(ms/86400000);
  const h = Math.floor((ms%86400000)/3600000);
  const m = Math.floor((ms%3600000)/60000);
  const s = Math.floor((ms%60000)/1000);
  return {d,h,m,s,past}
}

export function initTimers(){
  const timersWrap = document.getElementById('timers');
  const timerForm = document.getElementById('timerForm');
  const timerTitle = document.getElementById('timerTitle');
  const timerWhen = document.getElementById('timerWhen');

  let timers = store.get(TIMER_KEY, []); // {id,title,when}

  timerForm.addEventListener('submit', e=>{
    e.preventDefault();
    const title = timerTitle.value.trim();
    const when = timerWhen.value;
    if(!title || !when) return;
    timers.push({ id:crypto.randomUUID(), title, when });
    store.set(TIMER_KEY, timers);
    timerTitle.value=''; timerWhen.value='';
    renderTimers();
  });

  function timerCard(t){
    const card = document.createElement('div');
    card.className='timer-card';
    card.innerHTML = `
      <div class="timer-top">
        <div style="min-width:0">
          <div class="timer-title" title="${t.title}">${t.title}</div>
          <div class="timer-date">${fmtDate(t.when)}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn ghost" data-id="${t.id}" aria-label="Duplicar">Duplicar</button>
          <button class="btn danger" data-del="${t.id}" aria-label="Eliminar">Eliminar</button>
        </div>
      </div>
      <div class="countdown">
        <div class="dd">0</div><div class="sep">:</div>
        <div class="hh">00</div><div class="sep">:</div>
        <div class="mm">00</div><div class="sep">:</div>
        <div class="ss">00</div>
      </div>
      <div class="labels"><span>Días</span><span>Horas</span><span>Minutos</span><span>Segundos</span></div>
      <div class="status" style="margin-top:6px">
        <span class="pill"></span>
      </div>
    `;
    const dd=card.querySelector('.dd'),hh=card.querySelector('.hh'),
          mm=card.querySelector('.mm'),ss=card.querySelector('.ss'),
          pill=card.querySelector('.pill');
    function tick(){
      const p = getParts(t.when);
      dd.textContent = p.d;
      hh.textContent = pad(p.h);
      mm.textContent = pad(p.m);
      ss.textContent = pad(p.s);
      pill.textContent = p.past ? 'finalizado' : 'en curso';
      pill.style.background = p.past ? '#fee2e2' : 'var(--accent-100)';
      pill.style.color = p.past ? '#991b1b' : 'var(--accent)';
    }
    tick();
    const it = setInterval(tick,1000);
    card.addEventListener('remove', ()=>clearInterval(it));
    card.querySelector('[data-id]')?.addEventListener('click',()=>{
      timers.push({ id:crypto.randomUUID(), title:t.title+' (copia)', when:t.when });
      store.set(TIMER_KEY,timers); renderTimers();
    });
    card.querySelector('[data-del]')?.addEventListener('click',()=>{
      timers = timers.filter(x=>x.id!==t.id);
      store.set(TIMER_KEY,timers); renderTimers();
    });
    return card;
  }

  function renderTimers(){
    timersWrap.innerHTML='';
    timers.forEach(t=> timersWrap.appendChild(timerCard(t)));
  }

  renderTimers();
}
