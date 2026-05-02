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

  // Tabs que viven en el menú "Más"
  const overflowTabs = ['timers', 'progress', 'calendar'];

  const moreBtn  = document.getElementById('bnavMoreBtn');
  const moreMenu = document.getElementById('bnavMoreMenu');

  /* ── Abrir / cerrar menú Más ─────────────────────────── */
  function openMore() {
    moreMenu.classList.add('open');
    moreBtn?.setAttribute('aria-expanded', 'true');
  }
  function closeMore() {
    moreMenu.classList.remove('open');
    moreBtn?.setAttribute('aria-expanded', 'false');
  }

  moreBtn?.addEventListener('click', e => {
    e.stopPropagation();
    moreMenu.classList.contains('open') ? closeMore() : openMore();
  });

  // Cierra si toca fuera del menú
  document.addEventListener('click', e => {
    if (!moreMenu?.contains(e.target) && e.target !== moreBtn) closeMore();
  });

  /* ── Cambiar tab ─────────────────────────────────────── */
  function switchTab(tabName) {
    allTabBtns.forEach(b => {
      b.setAttribute('aria-selected', b.dataset.tab === tabName ? 'true' : 'false');
    });

    document.querySelectorAll('section.tab').forEach(s => s.classList.remove('active'));
    if (tabs[tabName]) tabs[tabName].classList.add('active');

    // Resalta botón "Más" si el tab activo está en overflow
    if (moreBtn) {
      moreBtn.classList.toggle('active', overflowTabs.includes(tabName));
    }

    closeMore();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.dispatchEvent(new CustomEvent('tab:changed', { detail: tabName }));
  }

  allTabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}
