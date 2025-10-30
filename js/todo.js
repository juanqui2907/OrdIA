import { store } from './store.js';

const TODO_KEY='todos_v1';

export function initTodo(){
  let todos = store.get(TODO_KEY, []); // {id,text,done}
  const todoText = document.getElementById('todoText');
  const addTodo = document.getElementById('addTodo');
  const todoList = document.getElementById('todoList');
  const clearDone = document.getElementById('clearDone');
  const clearAll = document.getElementById('clearAll');

  function renderTodos(){
    todoList.innerHTML='';
    if(!todos.length){
      const li=document.createElement('li');
      li.className='status';
      li.textContent='No hay tareas. Añade la primera.';
      todoList.appendChild(li);
      return;
    }
    todos.forEach(t=>{
      const li=document.createElement('li');
      li.className='todo-item'+(t.done?' done':'');
      li.innerHTML=`
        <input type="checkbox" ${t.done?'checked':''} aria-label="Completar" />
        <span>${t.text}</span>
        <span class="spacer"></span>
        ${t.done?'<span class="tag">hecha</span>':''}
        <button class="btn ghost" aria-label="Eliminar">Eliminar</button>
      `;
      const cb=li.querySelector('input[type=checkbox]');
      cb.addEventListener('change',()=>{
        t.done = cb.checked; store.set(TODO_KEY,todos); renderTodos();
      });
      li.querySelector('button').addEventListener('click',()=>{
        todos = todos.filter(x=>x.id!==t.id); store.set(TODO_KEY,todos); renderTodos();
      });
      todoList.appendChild(li);
    });
  }

  addTodo.addEventListener('click', ()=>{
    const text = todoText.value.trim();
    if(!text) return;
    todos.push({id:crypto.randomUUID(), text, done:false});
    store.set(TODO_KEY,todos);
    todoText.value=''; renderTodos();
  });
  todoText.addEventListener('keydown', e=>{
    if(e.key==='Enter'){ addTodo.click() }
  });
  clearDone.addEventListener('click', ()=>{
    todos = todos.filter(t=>!t.done); store.set(TODO_KEY,todos); renderTodos();
  });
  clearAll.addEventListener('click', ()=>{
    if(!confirm('¿Borrar todas las tareas?')) return;
    todos=[]; store.set(TODO_KEY,todos); renderTodos();
  });
  renderTodos();
}
