const CACHE = 'ordia-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './js/main.js',
  './js/tabs.js',
  './js/darkmode.js',
  './js/timers.js',
  './js/habits.js',
  './js/progress.js',
  './js/todo.js',
  './js/subjects.js',
  './js/pomodoro.js',
  './js/calendar.js',
  './js/today.js',
  './js/store.js',
  './js/todo-cal-bridge.js',
  './js/alert.js',
];

// Instalación: guarda todo en caché
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activación: limpia cachés viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: caché primero, luego red
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
