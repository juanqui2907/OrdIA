export function initTabs(){
  const allTabBtns = document.querySelectorAll('.tab-btn');
  const tabs = {
    today:    document.getElementById('tab-today'),
    timers:   document.getElementById('tab-timers'),
    habits:   document.getElementById('tab-habits'),
    progress: document.getElementById('tab-progress'),
    todo:     document.getElementById('tab-todo'),
    calendar: document.getElementById('tab-calendar'),
    pomodoro: document.getElementById('tab-pomodoro'),
  };

  function switchTab(tabName) {
    // Actualiza aria-selected en TODOS los botones (top nav + bottom nav)
    allTabBtns.forEach(b => {
      b.setAttribute('aria-selected', b.dataset.tab === tabName ? 'true' : 'false');
    });
    // Muestra la sección correcta
    document.querySelectorAll('section.tab').forEach(s => s.classList.remove('active'));
    if (tabs[tabName]) tabs[tabName].classList.add('active');

    // Scroll al top al cambiar tab en móvil
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.dispatchEvent(new CustomEvent('tab:changed', { detail: tabName }));
  }

  allTabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}
