import { initTabs } from './tabs.js';
import { initTimers } from './timers.js';
import { initHabits } from './habits.js';
import { initProgress } from './progress.js';
import { initTodo } from './todo.js';
import { initSubjects } from './subjects.js';
import { initPomodoro } from './pomodoro.js';
import { initCalendar } from './calendar.js';
import { initToday } from './today.js';
import { initDarkMode } from './darkmode.js';
import { store } from './store.js';

document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initTabs();
  initToday();
  initTimers();
  initHabits();
  initProgress();
  initTodo();
  initSubjects();
  initPomodoro();
  initCalendar();
});
