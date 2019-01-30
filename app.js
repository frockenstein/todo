// https://freecontent.manning.com/examining-update-events-with-computed-properties-in-vue-js/

const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const { Todo, TodoList } = require('./todo.js');

var todoStorage = {

  path: '/users/frock/dropbox/todo/',
  fileName: 'todo.txt',
  doneFile: 'done.txt',
  backupName: 'todo-backup.txt',

  load: function() {
    return fs.readFileSync(path.join(this.path, this.fileName))
      .toString()
      .split('\n')
      .filter(line => line);
  },

  write: function(todos) {
    if (!todos) throw 'No todos to write!';
    const data = todos.reduce((accumulator, todo) => accumulator + todo.text + '\n', '').trimRight('\n');
    const backup = path.join(this.path, this.backupName);
    const file = path.join(this.path, this.fileName);
    fs.copyFileSync(file, backup);
    fs.writeFileSync(file, data);
  },

  archive: function(todos, callback) {
    const data = todos.filter(x => x.isDone).reduce((accumulator, todo) => accumulator + todo.text + '\n', '').trimRight('\n');
    fs.appendFileSync(path.join(this.path, this.doneFile), data);
    this.write(todos.filter(x => x.isDone === false));
    callback();
  }
};

Vue.component('todo-list', {
  props: ['hash', 'list'],
  template: '#todo-list',
  methods: {
    sortedList: function() {
      return this.list.search(this.hash).sort((a, b) => {
        const aText = a.text.toLowerCase();
        const bText = b.text.toLowerCase();
        if (aText < bText) return -1;
        if (aText > bText) return 1;
        return 0;
      });
    },
    removeTodo: function(todo) {
      this.$emit('remove-todo', todo);
    }
  }
});

Vue.component('todo-item', {
  props: ['todo'],
  template: '#todo-item',
  data: function() {
    return {
      editing: false
    }
  },
  methods: {
    htmlify: function(todo) {
      let html = todo.text.replace(Todo.contextRegex, '<a class="context" href="#$1">$1</a>')
      html = html.replace(Todo.projectRegex, '<a class="project" href="#$1">$1</a>')
      return html.replace(Todo.linkRegex, '<a onclick="shell.openExternal(\'$1\'); return false" href="$1">$1</a> ')
    },
    editTodo: function(todo) {
      this.editing = todo.id;
      console.log(['edit', todo]);
    },
    cancelEdit: function(todo) {
      this.editing = null;
      console.log(['cancel', todo]);
    },
    doneEdit: function(todo) {
      this.editing = null;
      console.log(['done', todo]);
    },
    removeTodo: function(todo) {
      console.log(['delete', todo]);
      this.$emit('remove-todo', todo);
    },
    toggleDone: function(todo) {
      console.log(['toggle', todo]);
      todo.toggleDone();
    }
  },
  directives: {
    'todo-focus': function(el, binding) {
      if (binding.value) {
        setTimeout(() => el.focus(), 0);
      }
    }
  }
});

var app = new Vue({

  el: '#app',

  data: {
    filters: ['A', 'B', '@work', '@inbox', '+moto'],
    hash: '',
    newTodo: '',
    list: null
  },

  created: function() {
    // set this so that other components can trigger off it changing
    this.hash = window.location.hash.replace('#', '');
    this.load();
    // anytime the list changes, write to disk
    this.$watch('list.todos', {
      handler: function() {
        console.log('list.todos updated, saving...');
        if (this.list && this.list.todos.length) {
          todoStorage.write(this.list.todos);
        }
      },
      deep: true
    });
  },

  methods: {
    load: function() {
      const list = new TodoList();
      todoStorage.load().forEach(line => list.add(new Todo(line)));
      this.list = list;
    },
    addTodo: function() {
      const value = this.newTodo && this.newTodo.trim();
      if (!value) return;
      const todo = new Todo(this.newTodo);
      this.list.add(todo);
      this.newTodo = '';
      console.log(['add', todo]);
    },

    byPriority: function(priority) {
      return this.list.byPriority(priority)
    },
    search: function(what) {
      return this.list.search(what);
    },
    removeTodo: function(todo) {
      console.log(['remove event', todo]);
      this.list.remove(todo);
    },
    archive: function() {
      todoStorage.archive(this.list.todos, this.load);
    }
  },

  computed: {
    doneCount: function() {
      return this.list.todos.filter(x => x.isDone).length;
    },
    topPriorityCount: function() {
      return this.list.todos.filter(x => x.text.startsWith('(A)')).length;
    }
  }
});

// handle routing
function onHashChange () {
  app.hash = window.location.hash.replace('#', '');
  app.newTodo = app.hash;
  // if it's a project, add the ()
  if (app.hash.match(/^[A-Z]$/)) app.newTodo = `(${app.hash})`;
}

window.addEventListener('hashchange', onHashChange)

window.addEventListener('keyup', (event) => {
  if (event.target === document.body && event.code === 'Slash') {
    document.querySelectorAll('input.search')[0].focus();
  }
});