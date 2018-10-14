const crypto = require('crypto');

class TodoList {

  constructor() {
    this.todos = new Set();
    this.isDone = false;
  }

  add(todo) {
    this.todos.add(todo);
  }

  clear() {
    this.todos.clear();
  }

  search(what) {
    if (what.match(/^[A-Z]$/)) return this.byPriority(what);
    return [...this.todos].filter(todo => todo.text.includes(what));
  }

  byPriority(priority) {
    return [...this.todos].filter(todo => todo.text.startsWith(`(${priority})`));
  }

  noPriority() {
    return [...this.todos].filter(todo => todo.priority === null);
  }

  byId(id) {
    return [...this.todos].find(todo => todo.id === id);
  }

  contexts() {
    return this._getUnique(Todo.contextRegex);
  }

  projects() {
    return this._getUnique(Todo.projectRegex);
  }

  doneCount() {
    return [...this.todos].filter(todo => todo.isDone).length;
  }

  priorityCount(priority) {
    return this.byPriority(priority).length;
  }

  contextsByFrequency() {
    return this._getFrequency(Todo.contextRegex);
  }

  projectsByFrequency() {
    return this._getFrequency(Todo.projectRegex);
  }

  _getFrequency(regex) {

    // first get array of all contexts of all todos
    const arr = [...this.todos].reduce((acc, todo) => {
      const matches = todo.text.match(regex);
      return acc.concat(matches);
    }, []);

    // create new object with counts of each context occurrence
    const counts = arr.reduce((acc, item) => {
      acc[item] = acc[item] ? acc[item] + 1 : 1;
      return acc;
    }, Object.create(null));

    // sort that list, descending
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }

  _getUnique (regex) {
    let output = [];
    this.todos.forEach(todo => {
      const items = todo.text.match(regex);
      if (items.length === 0) return;
      for (let item of items) {
        if (output.includes(item)) continue;
        output.push(item);
      }
    });
    return output;
  }
}

class Todo {
  constructor(text) {
    if (!text || text === '') throw 'empty todo';
    this.isDone = false;
    this.text = text;
    this.priority = null;
    this.id = crypto.randomBytes(20).toString('hex');

    this._parsePriority();

    if (this.text.startsWith('x ')) {
      this.isDone = true;
    }
  }

  _parsePriority() {

    let parts  = this.text.split(' ');
    let output = [];
    let priority = null;
    let done = false;

    for (let part of parts) {
      const match = part.match(/\(([A-Z])\)/);
      if (match) {
        priority = match[1];
      }
      else if (part === 'x') {
        done = true;
      }
      else {
        output.push(part);
      }
    }

    if (priority) this.priority = priority;

    if (done) {
      output.unshift('x');
      if (priority) output.splice(1, 0, `(${priority})`);
    }
    else if (priority) {
      output.unshift(`(${priority})`);
    }

    this.text = output.join(' ');
  }

  toggleDone() {
    this.isDone = !this.isDone;
    if (this.isDone) this.text = `x ${this.text}`;
    else this.text = this.text.replace('x ', '');
  }

  contexts() {
    return this.text.match(Todo.contextRegex);
  }

  projects() {
    return this.text.match(Todo.projectRegex);
  }
}

Todo.contextRegex = /(@\w+)+/g;
Todo.projectRegex = /\B(\+\w+)/g;
Todo.linkRegex = /(http.*?)(\s|$)/g;

module.exports = { Todo, TodoList };