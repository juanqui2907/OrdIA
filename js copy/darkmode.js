const DARK_KEY = 'darkmode_v1';

export function initDarkMode() {
  const btn = document.getElementById('darkToggle');
  if (!btn) return;

  const saved = localStorage.getItem(DARK_KEY);
  let dark = saved !== null ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;

  function apply() {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    btn.textContent = dark ? '☀️' : '🌙';
    btn.title = dark ? 'Modo claro' : 'Modo oscuro';
    localStorage.setItem(DARK_KEY, dark);
  }

  btn.addEventListener('click', () => { dark = !dark; apply(); });
  apply();
}
