export function initTabs(){
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabs = {
    timers: document.getElementById('tab-timers'),
    habits: document.getElementById('tab-habits'),
    progress: document.getElementById('tab-progress'),
    todo: document.getElementById('tab-todo'),
    calendar: document.getElementById('tab-calendar'),
    pomodoro: document.getElementById('tab-pomodoro'), // 👈 nuevo
  };
  tabButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabButtons.forEach(b=>b.setAttribute('aria-selected','false'));
      btn.setAttribute('aria-selected','true');
      document.querySelectorAll('section.tab').forEach(s=>s.classList.remove('active'));
      tabs[btn.dataset.tab].classList.add('active');
    });
  });
}
