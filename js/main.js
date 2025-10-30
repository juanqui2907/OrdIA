import { initTabs } from './tabs.js';
import { initTimers } from './timers.js';
import { initHabits } from './habits.js';
import { initProgress } from './progress.js';
import { initTodo } from './todo.js';

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTimers();
  initHabits();
  initProgress(); // usa los mismos keys de hábitos
  initTodo();
});