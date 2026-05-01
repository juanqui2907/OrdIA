import { store } from './store.js';

const SUBJECTS_KEY = 'subjects_v1';
// estructura: [{ id, name, tasks:[{id,text,done}] }]

export function initSubjects(){
  const grid = document.getElementById('subjectsGrid');
  const addBtn = document.getElementById('addSubjectBtn');
  const nameInput = document.getElementById('newSubjectName');

  let subjects = store.get(SUBJECTS_KEY, []);

  function save(){ store.set(SUBJECTS_KEY, subjects); }

  function pctDone(subject){
    const total = subject.tasks.length || 1;
    const done = subject.tasks.filter(t=>t.done).length;
    return Math.round(100*done/total);
  }

  function subjectCard(s){
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = `
      <div class="subject-top">
        <div class="subject-title" title="${s.name}">${s.name}</div>
        <div class="subject-actions">
          <button class="btn ghost" data-rename="${s.id}" title="Renombrar">✏️</button>
          <button class="btn danger" data-del="${s.id}" title="Eliminar materia">🗑️</button>
        </div>
      </div>

      <div style="display:flex;gap:8px;align-items:center">
        <span class="pill">${s.tasks.filter(t=>t.done).length}/${s.tasks.length || 0}</span>
        <div class="subject-progress" style="flex:1"><i style="width:${pctDone(s)}%"></i></div>
      </div>

      <div class="subject-input">
        <input type="text" placeholder="Agregar pendiente (ej. Taller 3, Parcial 1...)">
        <button class="btn">Añadir</button>
      </div>

      <ul class="subject-list"></ul>
    `;

    const list = card.querySelector('.subject-list');
    const input = card.querySelector('.subject-input input');
    const btnAdd = card.querySelector('.subject-input .btn');

    function renderTasks(){
      list.innerHTML = '';
      if(!s.tasks.length){
        const li = document.createElement('li');
        li.className = 'status';
        li.textContent = 'Sin pendientes. Añade el primero.';
        list.appendChild(li);
        return;
      }
      s.tasks.forEach(t=>{
        const li = document.createElement('li');
        li.className = 'subject-item' + (t.done ? ' done' : '');
        li.innerHTML = `
          <input type="checkbox" ${t.done?'checked':''} aria-label="Completar">
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis">${t.text}</span>
          <button class="btn ghost" title="Eliminar">Eliminar</button>
        `;
        const cb = li.querySelector('input[type=checkbox]');
        cb.addEventListener('change', ()=>{
          t.done = cb.checked; save(); updateHeader(); renderTasks();
        });
        li.querySelector('button').addEventListener('click', ()=>{
          s.tasks = s.tasks.filter(x=>x.id!==t.id); save(); updateHeader(); renderTasks();
        });
        list.appendChild(li);
      });
    }

    function updateHeader(){
      const pill = card.querySelector('.pill');
      const bar  = card.querySelector('.subject-progress > i');
      pill.textContent = `${s.tasks.filter(t=>t.done).length}/${s.tasks.length || 0}`;
      bar.style.width   = pctDone(s) + '%';
    }

    btnAdd.addEventListener('click', ()=>{
      const text = input.value.trim();
      if(!text) return;
      s.tasks.push({ id:crypto.randomUUID(), text, done:false });
      input.value = '';
      save(); updateHeader(); renderTasks();
    });
    input.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ btnAdd.click(); }
    });

    card.querySelector('[data-del]').addEventListener('click', ()=>{
      if(!confirm(`¿Eliminar la materia "${s.name}" y todos sus pendientes?`)) return;
      subjects = subjects.filter(x=>x.id!==s.id); save(); renderSubjects();
    });
    card.querySelector('[data-rename]').addEventListener('click', ()=>{
      const nn = prompt('Nuevo nombre de la materia:', s.name);
      if(!nn) return;
      s.name = nn.trim(); save(); renderSubjects();
    });

    renderTasks();
    return card;
  }

  function renderSubjects(){
    grid.innerHTML = '';
    if(!subjects.length){
      const empty = document.createElement('div');
      empty.className = 'status';
      empty.textContent = 'Aún no tienes materias. Crea la primera arriba.';
      grid.appendChild(empty);
      return;
    }
    subjects.forEach(s=> grid.appendChild(subjectCard(s)));
  }

  addBtn.addEventListener('click', ()=>{
    const name = nameInput.value.trim();
    if(!name) return;
    subjects.push({ id:crypto.randomUUID(), name, tasks:[] });
    nameInput.value = '';
    save(); renderSubjects();
  });
  nameInput.addEventListener('keydown', e=>{
    if(e.key==='Enter'){ addBtn.click(); }
  });

  // Demo opcional: si no hay nada, puedes sembrar materias iniciales
  if(!subjects.length){
    subjects = [
      { id:crypto.randomUUID(), name:'Sistemas Eléctricos', tasks:[] },
      { id:crypto.randomUUID(), name:'Protecciones', tasks:[] }
    ];
    save();
  }

  renderSubjects();
}
