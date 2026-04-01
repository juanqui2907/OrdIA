export function initTabs(){
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabs = {
    today: document.getElementById('tab-today'),
    timers: document.getElementById('tab-timers'),
    habits: document.getElementById('tab-habits'),
    progress: document.getElementById('tab-progress'),
    todo: document.getElementById('tab-todo'),
    calendar: document.getElementById('tab-calendar'),
    pomodoro: document.getElementById('tab-pomodoro'),
  };
  tabButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabButtons.forEach(b=>b.setAttribute('aria-selected','false'));
      btn.setAttribute('aria-selected','true');
      document.querySelectorAll('section.tab').forEach(s=>s.classList.remove('active'));
      const tabName = btn.dataset.tab;
      if (tabs[tabName]) tabs[tabName].classList.add('active');
      document.dispatchEvent(new CustomEvent('tab:changed', { detail: tabName }));
    });
  });
}
