/**
 * alert.js — sonido + vibración + notificación push
 * Usado por Pomodoro y Timers
 */

/* ── Sonido con Web Audio API (sin archivos) ─────────────── */
let _ctx = null;
function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
}

/**
 * Toca una melodía de 3 tonos.
 * type: 'work' | 'break' | 'timer'
 */
export function playSound(type = 'work') {
  try {
    const ctx = getCtx();
    // Resume en caso de que esté suspendido (política autoplay)
    if (ctx.state === 'suspended') ctx.resume();

    const notes = {
      work:  [523, 659, 784],   // Do Mi Sol — "a trabajar"
      break: [784, 659, 523],   // Sol Mi Do — "descansa"
      timer: [880, 880, 1047],  // La La Do alta — alarma
    };

    const freqs = notes[type] || notes.work;
    const now = ctx.currentTime;

    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type      = type === 'timer' ? 'square' : 'sine';
      osc.frequency.value = freq;

      const start = now + i * 0.22;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.04);
      gain.gain.linearRampToValueAtTime(0,    start + 0.2);

      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch (e) {
    // silencio si el navegador no soporta Web Audio
  }
}

/* ── Vibración ───────────────────────────────────────────── */
export function vibrate(type = 'work') {
  if (!navigator.vibrate) return;
  const patterns = {
    work:  [100, 60, 100],           // dos pulsos
    break: [200],                    // uno largo
    timer: [100, 50, 100, 50, 200],  // patrón de alarma
  };
  navigator.vibrate(patterns[type] || patterns.work);
}

/* ── Notificación push ───────────────────────────────────── */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendNotification(title, body, icon = './icon-192.png') {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon, badge: './icon-192.png' });
  } catch (e) {}
}
