// https://freecontent.manning.com/examining-update-events-with-computed-properties-in-vue-js/
// https://blog.dcpos.ch/how-to-make-your-electron-app-sexy

const fs = require('fs');
const path = require('path');
const { shell, ipcRenderer } = require('electron');
const { Todo, TodoList } = require('./todo.js');

const todoStorage = {

  path: '/users/frock/dropbox/todo',
  fileName: 'todo.txt',
  doneFile: 'done.txt',
  backupName: 'todo-backup.txt',

  load() {
    return fs.readFileSync(path.join(this.path, this.fileName))
      .toString()
      .split('\n')
      .filter(line => line);
  },

  write(todos) {
    if (!todos) throw 'No todos to write!';
    const data = todos.reduce((accumulator, todo) => accumulator + todo.text + '\n', '').trimRight('\n');
    const backup = path.join(this.path, this.backupName);
    const file = path.join(this.path, this.fileName);
    fs.copyFileSync(file, backup);
    fs.writeFileSync(file, data);
  },

  archive(todos, callback) {
    const data = todos.filter(x => x.isDone).reduce((accumulator, todo) => accumulator + todo.text + '\n', '').trimRight('\n');
    fs.appendFileSync(path.join(this.path, this.doneFile), data);
    this.write(todos.filter(x => x.isDone === false));
    callback();
  }
};

Vue.component('timer', {
  template: '#timer',
  data() {
    return {
      defaultTime: '25:00',
      time: '01:00',
      noise: false
    }
  },
  created() {
    this.time = this.defaultTime;
  },
  methods: {
    start(e) {
      e.preventDefault();
      this.countdown = parseInt(this.defaultTime) * 60;

      if (!this.audio && this.noise) {
        this.audio = new Audio('brown.wav');
        this.audio.loop = true;
      }
      if (this.noise) this.audio.play();

      const timer = () => {
        --this.countdown;
        const minutes = Math.floor(this.countdown / 60);
        const seconds = Math.floor(this.countdown % 60);
        this.time = `${minutes}:${seconds}`;
        
        if (this.countdown <= 0) {
          this.audio.pause();
          clearInterval(this.interval);
          alert('donezo');
        }
      };
      timer();
      if (!this.interval) this.interval = setInterval(timer, 1000);
    },
    stop(e) {
      e.preventDefault();
      if (this.audio) this.audio.pause();
      clearInterval(this.interval);
    },
    reset(e) {
      e.preventDefault();
      clearInterval(this.interval);
      this.time = this.defaultTime;
      if (this.audio) this.audio.pause();
    },
    brownSound(e) {
      this.noise = !this.noise;
      if (!this.noise && this.audio) this.audio.pause();
    }
  }
})

Vue.component('quad', {
  props: ['list', 'hash'],
  template: '#quad',
  data() {
    return {
      isActive: false,
      index: 0,
      quads: [
        { index: 1, title: 'strategery' },
        { index: 2, title: 'homer' },
        { index: 3, title: 'todont' },
        { index: 4, title: 'housekeeping' }
      ]
  }},
  methods: {
    byIndex(index) {
      return this.list.sort(this.list.search(`quad:${index}`));
    },
    onToggle(e) {
      e.preventDefault();
      this.isActive = !this.isActive;
      return false;
    }
  }
});

Vue.component('todo-list', {
  props: ['hash', 'list'],
  template: '#todo-list',
  methods: {
    sortedList() {
      return this.list.sort(this.list.search(this.hash));
    },
    removeTodo(todo) {
      this.$emit('remove-todo', todo);
    }
  }
});

Vue.component('todo-item', {
  
  props: ['todo'],
  template: '#todo-item',
  
  data() {
    return {
      editing: false
    }
  },
  
  methods: {
    htmlify(todo) {
      let html = todo.text.replace(Todo.contextRegex, '<a class="context" href="#$1">$1</a>')
      html = html.replace(Todo.projectRegex, '<a class="project" href="#$1">$1</a>')
      return html.replace(Todo.linkRegex, '<a onclick="shell.openExternal(\'$1\'); return false" href="$1">$1</a> ')
    },
    editTodo(todo) {
      this.editing = todo.id;
      console.log(['edit', todo]);
    },
    cancelEdit(todo) {
      this.editing = null;
      console.log(['cancel', todo]);
    },
    doneEdit(todo) {
      this.editing = null;
      console.log(['done', todo]);
    },
    removeTodo(todo) {
      console.log(['delete', todo]);
      this.$emit('remove-todo', todo);
    },
    toggleDone(todo) {
      console.log(['toggle', todo]);
      todo.toggleDone();
    }
  },
  
  directives: {
    'todo-focus'(el, binding) {
      if (binding.value) {
        setTimeout(() => el.focus(), 0);
      }
    }
  }
});

var app = new Vue({

  el: '#list',

  data: {
    filters: ['A', 'B', '@work', '@inbox', '+moto'],
    hash: '',
    newTodo: '',
    list: null,
  },

  created() {
    // set this so that other components can trigger off it changing
    this.hash = window.location.hash.replace('#', '');
    this.load();
    // anytime the list changes, write to disk
    this.$watch('list.todos', {
      handler() {
        console.log('list.todos updated, saving...');
        if (this.list && this.list.todos.length) {
          todoStorage.write(this.list.todos);
        }
      },
      deep: true
    });
  },

  methods: {
    
    load() {
      const list = new TodoList();
      todoStorage.load().forEach(line => list.add(new Todo(line)));
      this.list = list;
    },
    
    addTodo() {
      const value = this.newTodo && this.newTodo.trim();
      if (!value) return;
      const todo = new Todo(this.newTodo);
      this.list.add(todo);
      this.newTodo = '';
      console.log(['add', todo]);
    },

    byPriority(priority) {
      return this.list.byPriority(priority)
    },
    
    search(what) {
      return this.list.search(what);
    },
    
    removeTodo(todo) {
      console.log(['remove event', todo]);
      this.list.remove(todo);
    },
    
    archive() {
      todoStorage.archive(this.list.todos, this.load);
    }
  },

  computed: {
    
    doneCount() {
      return this.list.todos.filter(x => x.isDone).length;
    },
    
    topPriorityCount() {
      return this.list.todos.filter(x => x.text.startsWith('(A)')).length;
    }
  }
});

function searchFocus() {
  document.querySelectorAll('input.search')[0].select();
}

function render(what) {
  ['list', 'quad'].forEach(x => document.getElementById(x).style.visibility = 'hidden');
  document.getElementById(`${what}`).style.visibility = 'visible';
}

// handle routing

window.addEventListener('hashchange', () => {
  app.hash = window.location.hash.replace('#', '');
  app.newTodo = app.hash;
  // if it's a project, add the ()
  if (app.hash.match(/^[A-Z]$/)) app.newTodo = `(${app.hash})`;
});

// focus the search box for these commands
window.addEventListener('keyup', (event) => {
  if (event.target === document.body && event.code === 'Slash') {
    searchFocus();
  }
});

ipcRenderer.on('find', searchFocus);
ipcRenderer.on('list', () => render('list'));
ipcRenderer.on('quad', () => render('quad'));