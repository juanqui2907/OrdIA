export function initTabs(){
  const allTabBtns = document.querySelectorAll('.tab-btn');
  const moreBtn    = document.getElementById('bnavMoreBtn');
  const moreMenu   = document.getElementById('bnavMoreMenu');

  // tabs ocultos en overflow
  const overflowTabs = new Set(['timers', 'progress']);

  const tabs = {
    today:    document.getElementById('tab-today'),
    timers:   document.getElementById('tab-timers'),
    habits:   document.getElementById('tab-habits'),
    progress: document.getElementById('tab-progress'),
    todo:     document.getElementById('tab-todo'),
    calendar: document.getElementById('tab-calendar'),
    pomodoro: document.getElementById('tab-pomodoro'),
  };

  function closeMore(){ moreMenu?.classList.remove('open'); }

  function switchTab(tabName){
    // Actualiza todos los botones (top + bottom + overflow)
    allTabBtns.forEach(b => {
      b.setAttribute('aria-selected', b.dataset.tab === tabName ? 'true' : 'false');
    });

    // Resalta "Más" si el tab activo es uno de los overflow
    if (moreBtn){
      moreBtn.classList.toggle('active', overflowTabs.has(tabName));
    }

    // Muestra la sección correcta
    document.querySelectorAll('section.tab').forEach(s => s.classList.remove('active'));
    if (tabs[tabName]) tabs[tabName].classList.add('active');

    closeMore();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.dispatchEvent(new CustomEvent('tab:changed', { detail: tabName }));
  }

  // Listeners de todos los botones de tab
  allTabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Botón "Más" — abre/cierra el menú
  moreBtn?.addEventListener('click', e => {
    e.stopPropagation();
    moreMenu?.classList.toggle('open');
  });

  // Click fuera cierra el menú
  document.addEventListener('click', closeMore);
  moreMenu?.addEventListener('click', e => e.stopPropagation());
}
