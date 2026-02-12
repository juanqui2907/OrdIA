import { initTabs } from './tabs.js';
import { initTimers } from './timers.js';
import { initHabits } from './habits.js';
import { initProgress } from './progress.js';
import { initTodo } from './todo.js';
import { initSubjects } from './subjects.js';
import { initPomodoro } from './pomodoro.js'; // nuevo
import { initCalendar } from './calendar.js';

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTimers();
  initHabits();
  initProgress();
  initTodo();
  initSubjects();
  initPomodoro(); // nuevo
  initCalendar();
});
