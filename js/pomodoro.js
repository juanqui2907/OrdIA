import { playSound, vibrate, requestNotificationPermission, sendNotification } from './alert.js';
import { store } from './store.js';

// claves de almacenamiento
const CFG_KEY   = 'pomodoro_cfg_v1';
const STATE_KEY = 'pomodoro_state_v1';

// config por defecto
const defaultCfg = {
  workMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoNext: false,
  soundOn: true,
  notifyOn: true
};

function loadCfg(){
  const cfg = store.get(CFG_KEY, defaultCfg);
  return { ...defaultCfg, ...cfg };
}
function saveCfg(cfg){ store.set(CFG_KEY, cfg); }

function loadState(){
  return store.get(STATE_KEY, {
    mode: 'work',          // 'work' | 'short' | 'long'
    running: false,
    cycle: 0,              // cuenta de pomodoros completados en este bloque
    endsAt: null,          // timestamp millis (si está corriendo)
    remainingMs: null      // si está pausado, tiempo restante
  });
}
function saveState(st){ store.set(STATE_KEY, st); }


export function initPomodoro(){
  // elementos
  const btnsMode = document.querySelectorAll('.pom-mode');
  const autoNext = document.getElementById('autoNext');

  const durWork  = document.getElementById('durWork');
  const durShort = document.getElementById('durShort');
  const durLong  = document.getElementById('durLong');
  const longEvery= document.getElementById('longEvery');

  const btnStart = document.getElementById('pomStart');
  const btnPause = document.getElementById('pomPause');
  const btnResume= document.getElementById('pomResume');
  const btnReset = document.getElementById('pomReset');
  const btnSkip  = document.getElementById('pomSkip');

  const timeEl   = document.getElementById('pomTime');
  const phaseEl  = document.getElementById('pomPhase');
  const canvas   = document.getElementById('pomCanvas');
  const ctx      = canvas.getContext('2d');

  // estado y config
  let cfg = loadCfg();
  let st  = loadState();
  let raf = null;

  // inicializa UI con cfg
  durWork.value   = cfg.workMin;
  durShort.value  = cfg.shortMin;
  durLong.value   = cfg.longMin;
  longEvery.value = cfg.longEvery;
  autoNext.checked= cfg.autoNext;

  // mapea duración actual por modo
  function modeMinutes(mode){
    return mode==='work' ? cfg.workMin : mode==='short' ? cfg.shortMin : cfg.longMin;
  }

  // dibuja el círculo de progreso
  function drawProgress(remainingMs, totalMs, color='#9d4edd'){
    const W=canvas.width, H=canvas.height, r=120, cx=W/2, cy=H/2;
    ctx.clearRect(0,0,W,H);

    // base
    ctx.beginPath();
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 14;
    ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.stroke();

    // progreso
    const pct = Math.max(0, Math.min(1, 1 - remainingMs/totalMs));
    const start = -Math.PI/2;
    const end   = start + Math.PI*2*pct;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.arc(cx,cy,r,start,end);
    ctx.stroke();
  }

  function fmt(ms){
    const total = Math.max(0, Math.ceil(ms/1000));
    const m = Math.floor(total/60);
    const s = total%60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function phaseName(mode){
    return mode==='work' ? 'Trabajo' : mode==='short' ? 'Descanso corto' : 'Descanso largo';
  }
  function phaseColor(mode){
    return mode==='work' ? '#9d4edd' : mode==='short' ? '#16a34a' : '#0ea5e9';
  }

  async function ensureNotificationPermission(){
    if (!cfg.notifyOn) return;
    await requestNotificationPermission();
  }

  function notifyNext(nextMode){
    if (!cfg.notifyOn) return;
    const titles = { work: '🍅 ¡A trabajar!', short: '☕ Descanso corto', long: '🛋️ Descanso largo' };
    const bodies = { work: 'Arranca la siguiente sesión de concentración.', short: 'Tómate unos minutos.', long: 'Buen trabajo, mereces un descanso largo.' };
    sendNotification('OrdIA — Pomodoro', `${titles[nextMode]} ${bodies[nextMode]}`);
  }


  function beep(type='work'){
    if (!cfg.soundOn) return;
    playSound(type);
    vibrate(type);
  }

  function setMode(mode){
    st.mode = mode;
    phaseEl.textContent = phaseName(mode);
    btnsMode.forEach(b=>{
      const active = b.dataset.mode === mode;
      b.classList.toggle('secondary', !active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function startPhase(mode){
    setMode(mode);
    const totalMs = modeMinutes(mode)*60*1000;
    st.running   = true;
    st.remainingMs = null;
    st.endsAt    = Date.now() + totalMs;
    saveState(st);
    setControls('running');
    tick(); // arranca animación
  }

  function nextModeAfter(mode){
    if (mode==='work'){
      const isLong = (st.cycle+1) % cfg.longEvery === 0;
      return isLong ? 'long' : 'short';
    }
    // si venías de descanso, vuelves a trabajo
    return 'work';
  }

  function onPhaseEnd(){
    // si terminó trabajo, sube el ciclo
    if (st.mode === 'work') st.cycle += 1;
    const next = nextModeAfter(st.mode);
    beep(next);
    notifyNext(next);
    if (cfg.autoNext){
      startPhase(next);
    } else {
      // queda en idle con modo siguiente preseleccionado
      setMode(next);
      st.running=false; st.endsAt=null; st.remainingMs=null;
      saveState(st);
      setControls('idle');
      // pinta 100% completado de la fase previa
      drawProgress(0, 1, phaseColor(st.mode));
    }
  }

  function setControls(state){
    // state: 'idle' | 'running' | 'paused'
    btnStart.disabled  = state!=='idle';
    btnPause.disabled  = state!=='running';
    btnResume.disabled = state!=='paused';
    btnReset.disabled  = state==='idle';
    btnSkip.disabled   = state==='idle'; // se puede saltar si hay algo activo o pausado
  }

  function tick(){
    if (!st.running || !st.endsAt){
      cancelAnimationFrame(raf);
      return;
    }
    const now = Date.now();
    const totalMs = modeMinutes(st.mode)*60*1000;
    const remaining = Math.max(0, st.endsAt - now);

    timeEl.textContent = fmt(remaining);
    drawProgress(remaining, totalMs, phaseColor(st.mode));

    if (remaining <= 0){
      st.running=false; st.endsAt=null; st.remainingMs=null;
      saveState(st);
      setControls('idle');
      onPhaseEnd();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  // botones de modo
  btnsMode.forEach(b=>{
    b.addEventListener('click', ()=>{
      const target = b.dataset.mode;
      // solo cambia si no está corriendo
      if (st.running) return;
      setMode(target);
      const totalMs = modeMinutes(target)*60*1000;
      timeEl.textContent = fmt(totalMs);
      drawProgress(totalMs, totalMs, phaseColor(target));
      saveState(st);
    });
  });

  // controles
  btnStart.addEventListener('click', ()=>{
    ensureNotificationPermission();
    startPhase(st.mode || 'work');
  });
  btnPause.addEventListener('click', ()=>{
    if (!st.running || !st.endsAt) return;
    st.remainingMs = Math.max(0, st.endsAt - Date.now());
    st.running=false; st.endsAt=null;
    saveState(st);
    setControls('paused');
  });
  btnResume.addEventListener('click', ()=>{
    if (st.running || st.remainingMs==null) return;
    st.running=true; st.endsAt=Date.now()+st.remainingMs; st.remainingMs=null;
    saveState(st);
    setControls('running');
    tick();
  });
  btnReset.addEventListener('click', ()=>{
    st.running=false; st.endsAt=null; st.remainingMs=null;
    saveState(st);
    const totalMs = modeMinutes(st.mode)*60*1000;
    timeEl.textContent = fmt(totalMs);
    drawProgress(totalMs, totalMs, phaseColor(st.mode));
    setControls('idle');
  });
  btnSkip.addEventListener('click', ()=>{
    if (st.running || st.remainingMs!=null || st.endsAt!=null){
      // si estaba activo o pausado, paramos y saltamos
      st.running=false; st.endsAt=null; st.remainingMs=null;
      saveState(st);
    }
    const next = nextModeAfter(st.mode);
    setMode(next);
    const totalMs = modeMinutes(next)*60*1000;
    timeEl.textContent = fmt(totalMs);
    drawProgress(totalMs, totalMs, phaseColor(next));
    setControls('idle');
  });

  // configuración
  function persistDurations(){
    cfg.workMin  = Math.max(1, parseInt(durWork.value  || defaultCfg.workMin, 10));
    cfg.shortMin = Math.max(1, parseInt(durShort.value || defaultCfg.shortMin, 10));
    cfg.longMin  = Math.max(1, parseInt(durLong.value  || defaultCfg.longMin, 10));
    cfg.longEvery= Math.max(2, parseInt(longEvery.value|| defaultCfg.longEvery, 10));
    saveCfg(cfg);

    // si está en idle/paused, refresca la carátula con la nueva duración de la fase actual
    if (!st.running){
      const totalMs = modeMinutes(st.mode)*60*1000;
      timeEl.textContent = fmt(totalMs);
      drawProgress(totalMs, totalMs, phaseColor(st.mode));
    }
  }
  [durWork,durShort,durLong,longEvery].forEach(inp=>{
    inp.addEventListener('change', persistDurations);
  });
  autoNext.addEventListener('change', ()=>{
    cfg.autoNext = !!autoNext.checked; saveCfg(cfg);
  });

  // atajos de teclado
  document.addEventListener('keydown', (e)=>{
    if (document.querySelector('#tab-pomodoro').classList.contains('active') === false) return;
    if (e.code==='Space'){ e.preventDefault(); 
      if (st.running) btnPause.click(); else if (st.remainingMs!=null) btnResume.click(); else btnStart.click();
    }
    if (e.key==='r' || e.key==='R'){ e.preventDefault(); btnReset.click(); }
    if (e.key==='n' || e.key==='N'){ e.preventDefault(); btnSkip.click(); }
  });

  // restaurar estado al cargar
  setMode(st.mode || 'work');
  // si estaba corriendo, retoma con endsAt; si estaba pausado, muestra remaining
  if (st.running && st.endsAt){
    setControls('running');
    tick();
  } else if (st.remainingMs!=null){
    setControls('paused');
    timeEl.textContent = fmt(st.remainingMs);
    drawProgress(st.remainingMs, modeMinutes(st.mode)*60*1000, phaseColor(st.mode));
  } else {
    setControls('idle');
    const totalMs = modeMinutes(st.mode)*60*1000;
    timeEl.textContent = fmt(totalMs);
    drawProgress(totalMs, totalMs, phaseColor(st.mode));
  }
}
