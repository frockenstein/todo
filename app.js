/*
TODO:
* contexts and projects ranked by frequency
* mark undone shenanigans
* pluck priority out and set at front of todo
* focus() shenanigans
* clean up <form> vs Enter
* onCombo vs ipc + electron shortcuts
* sort or break out into various blocks by context?
* uncategorized ones are set to +inbox
* settings window with path to dropbox file, how to store??
* stat file, reload when it changes
* tests???
* react??
* show stats on how many completed?
* archive old shit
*/
const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

class TodoView {

  constructor(options) {
    this.path = options.path;
    this.file = options.file || 'todo.txt';
    this.list = list;
    this.form = document.querySelector('form');
    this.ul = document.querySelector('ul');
    this.search = document.querySelector('input[name=search]');
    this.donezo = document.querySelector('input[name=donezo]');
    this.showing = document.querySelector('#showing');
    this.stats = document.querySelector('#stats');

    this.handleEvents();
  }

  handleEvents() {

    this.onCombo((e) => {
      if (e.target.tagName === 'INPUT') return;
      history.go(-1);
    }, 'MetaLeft', 'ArrowLeft');

    this.onCombo((e) => {
      if (e.target.tagName === 'INPUT') return;
      history.go(1);
    }, 'MetaLeft', 'ArrowRight');

    this.onCombo(() => this.search.focus(), 'MetaLeft', 'KeyF');

    this.on(window, 'hashchange', e => this.hashChange(e));

    this.on(this.form, 'submit', e => {
      e.preventDefault();
      const input = e.target.querySelector('input');
      const todo = new Todo(input.value);
      this.addTodo(todo);

      this.list.add(todo);
      this.writeFile(this.list.todos);

      input.value = '';
      //input.focus();
      this.list.clear();
      this.resetTodos();
    });

    this.on(this.form.querySelector('input'), 'keyup', e => {
      e.preventDefault();
      return false;
    });

    this.on(this.search, 'keyup', e => this.searchChange(e.target.value));

    this.init(() => {
      this.on(this.ul.querySelectorAll('a.external'), 'click', e => {
        e.preventDefault();
        shell.openExternal(e.target.href);
      });
    });
  }

  on(element, eventName, fn) {
    if (element.forEach) {
      element.forEach(el => el.addEventListener(eventName, event => fn(event)));
    }
    else {
      element.addEventListener(eventName, event => fn(event));
    }
  }

  init(callback = null) {
    if (this.list.todos.size === 0) {
      const file = path.join(this.path, this.file);
      const lines = this.loadFile(file);
      lines.forEach(line => this.list.add(new Todo(line)));
    }

    // show by type if on url
    const hash = this.getHash();
    let todos = this.list.todos;
    if (hash) {
      const input = this.form.querySelector('input');
      input.value = this.getHashForDisplay();
      //input.focus();
      if (hash.match(/^[A-D]$/))
        input.value = input.value + ' ';
      else
        input.setSelectionRange(0, 0);

      todos = this.list.search(hash);
      this.setShowing(hash);
    }

    this.addTodos(todos);
    this.showStats();
    if (callback) callback();
  }

  loadFile(file) {
    return fs.readFileSync(file)
      .toString()
      .split('\n')
      .sort()
      .filter(line => line); // removes empty items
  }

  writeFile(list) {
    if (!list) throw 'No list to write!';
    const data = [...list].reduce((accumulator, todo) => accumulator + todo.text + '\n', '').trimRight('\n');
    const backup = path.join(this.path, 'todo-backup.txt');
    const file = path.join(this.path, this.file);
    fs.copyFileSync(file, backup);
    fs.writeFileSync(file, data);
  }

  addTodos(todos) {
    todos.forEach(todo => this.addTodo(todo));
  }

  addTodo(todo) {
    let li = document.createElement('li');
    li.todo = todo;
    li = this.htmlGuts(todo, li);
    if (todo.isDone) li.className = 'done';
    this.on(li, 'dblclick', e => this.editTodo(e));
    this.ul.appendChild(li);
  }

  editTodo(event) {
    let li = event.target.closest('li');
    const text = li.innerText;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = li.innerText;
    input.className = 'todoUpdate';

    this.on(input, 'blur', e => {
      li.innerHTML = '';
      const todo = new Todo(text);
      this.htmlGuts(todo, li);
    });

    this.on(input, 'keyup', e => {
      if (e.code === 'Enter' || e.code === 'Escape') {
        li.todo.text = input.value;
        li.innerHTML = '';
        li = this.htmlGuts(li.todo, li);
        if (e.code === 'Enter') this.writeFile(this.list.todos);
      }
    });

    li.innerHTML = '';
    li.appendChild(input);
    input.focus();
    //input.setSelectionRange(0, 0);
  }

  htmlGuts(todo, li) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    this.on(checkbox, 'click', (e) => {
      const li = e.target.closest('li');
      this.list.byId(li.todo.id).toggleDone();
      if (todo.isDone) li.className = 'done';
      else li.className = '';
      this.writeFile(this.list.todos);
      this.showStats();
    });

    let html = todo.text.replace(Todo.contextRegex, '<a class="context" href="#$1">$1</a>')
    html = html.replace(Todo.projectRegex, '<a class="project" href="#$1">$1</a>')
    html = html.replace(Todo.linkRegex, '<a class="external" href="$1">$1</a> ')
    const div = document.createElement('div');
    div.style = "display: inline";
    div.innerHTML = html;

    li.appendChild(checkbox);
    li.appendChild(div);
    return li;
  }

  onCombo(fn, ...codes) {
    let pressed = new Set();
    this.on(document, 'keydown', event => {
      pressed.add(event.code);

      for (let code of codes) {
        if (!pressed.has(code)) return;
      };
      pressed.clear();
      fn(event);
    });

    this.on(document, 'keyup', event => {
      pressed.delete(event.code);
    });
  }

  hashChange(event) {
    const hash = this.getHash();

    if (hash === '') {
      this.clearList();
      this.showing.innerHTML = '';
      this.form.querySelector('input').value = '';
      this.init();
      return;
    }

    this.setShowing(hash);
    this.form.querySelector('input').value = this.getHashForDisplay();

    this.clearList();
    this.addTodos(list.search(hash));
  }

  setShowing(hash) {
    const displayHash = this.getHashForDisplay();
    const className = hash.startsWith('+') ? 'project' : 'context';
    this.showing.innerHTML = `Showing <a class="${className}" href="#${hash}">${displayHash}</a> <a href="#">clear</a>`;
  }

  showStats() {
    this.stats.innerHTML = `Done: <b class="doneCount">${this.list.doneCount()}</b>, Top Priority: <b class="topPriorityCount">${this.list.priorityCount("A")}</b>`;
  }

  getHash() {
    return location.hash.replace('#', '');
  }

  getHashForDisplay() {
    let hash = location.hash.replace('#', '');
    if (hash.match(/^[A-D]$/)) return `(${hash})`;
    return hash;
  }

  clearList() {
    this.ul.innerHTML = '';
  }

  resetTodos() {
    this.clearList();
    this.init();
  }

  searchChange(value) {

    if (value === '') {
      this.resetTodos();
      return;
    }

    const todos = this.list.search(value);
    this.clearList();
    this.addTodos(todos);
  }
}

const list = new TodoList();
const view = new TodoView({
  list: list,
  path: '/users/frock/dropbox/todo/',
  file: 'todo.txt'
});
