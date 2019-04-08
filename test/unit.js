const assert = require('assert');
const { TodoList, Todo } = require('../todo.js');

describe('Unit Testes', function() {
  beforeEach(function() {
    this.list = new TodoList();
  });

  it('adds todo items to the list', function() {
    const todo = new Todo('(A) test item');
    this.list.add(todo);
    assert(this.list.todos.length == 1);
  });

  it('handles done todos correctly', function() {
    const todo = new Todo('something');
    todo.toggleDone();
    assert(todo.isDone);
    assert(todo.text.startsWith('x '), 'whuh?');

    todo.toggleDone();
    assert(todo.isDone === false);
    assert(todo.text === 'something');

    const notDone = new Todo('xylophone');
    assert(notDone.isDone === false);
  });

  it('sets priority correctly', function() {
    const a = new Todo('(A) top priority');
    const none = new Todo('no priority');
    assert(a.priority === 'A');
    assert(none.priority == undefined);

    const middle = new Todo('@home do something (A) here');
    assert(middle.priority === 'A');
    assert(middle.text.startsWith('(A) '), middle.text);

    const end = new Todo('@home something at end (A)');
    assert(end.priority === 'A');
    assert(end.text.startsWith('(A) '), end.text);

    const done = new Todo('x (A) donezo');
    assert(done.priority === 'A');
    assert(done.isDone);
  });

  it('gets unique contexts', function() {
    this.list.add(new Todo('@home something @work'));
    this.list.add(new Todo('@work something else @work @sniff'));
    // make sure regex doesn't pick up emails
    this.list.add(new Todo('send an email to fart@sniff.com'));
    const contexts = this.list.contexts();
    const expected = ['@home', '@work', '@sniff'];
    assert(contexts[0] == expected[0]);
    assert(contexts[1] == expected[1]);
    assert(contexts[2] == expected[2]);
  });

  it('gets unique projects', function() {
    this.list.add(new Todo('+home something +work'));
    this.list.add(new Todo('+work something else +home +home'));
    const projects = this.list.projects();
    const expected = ['+home', '+work'];
    assert(projects[0] == expected[0]);
    assert(projects[1] == expected[1]);
  });

  it('gets todos by priority', function() {
    this.list.add(new Todo('(A) top priority'));
    const a = this.list.byPriority('A');
    assert(a.length === 1);
    assert(a[0].priority === 'A');
  });

  it ('gets todos with NO priority', function() {
    this.list.add(new Todo('(A) top priority'));
    this.list.add(new Todo('(B) lower priority'));
    this.list.add(new Todo('no priority'));
    const result = this.list.noPriority();
    assert(result.length === 1);
    assert(result[0].priority === null);
  });

  it('searches for todos', function() {
    this.list.add(new Todo('something'));
    this.list.add(new Todo('else'));
    this.list.add(new Todo('x someTHING done todo'));
    const results = this.list.search('thing');
    assert(results.length == 2);
    assert(results[0].text == 'something');
  });

  it('finds todos by id', function() {
    const a = new Todo('fart');
    const b = new Todo('sniff');
    const id = a.id;
    this.list.add(a);
    this.list.add(b);
    const found = this.list.byId(id);
    assert(found && found.id === id);
  });

  it('counts done items', function() {
    this.list.add(new Todo('x fart'));
    this.list.add(new Todo('x sniff'));
    this.list.add(new Todo('real item'));
    assert(this.list.doneCount() == 2, `nope: ${this.list.doneCount()}`);
  });

  it('counts high priority items', function() {
    this.list.add(new Todo('(A) big time'));
    this.list.add(new Todo('(B) kinda big time'));
    this.list.add(new Todo('not big time at all'));
    assert(this.list.priorityCount('A') === 1);
  });

  it('gets a list of contexts ranked by frequency', function() {
    this.list.add(new Todo('@ball @sniff'));
    this.list.add(new Todo('@fart @sniff'));
    const expected = ['@sniff', '@ball', '@fart'];
    const actual = this.list.contextsByFrequency();
    assert.deepEqual(actual, expected);
  });

  it('gets a list of projects ranked by frequency', function() {
    this.list.add(new Todo('+house +finance'));
    this.list.add(new Todo('+house +money'));
    const expected = ['+house', '+finance', '+money'];
    const actual = this.list.projectsByFrequency();
    assert.deepEqual(actual, expected);
  });

  // in progress
  it('processes external links correctly', function() {
    let text = '@something https://confluence.boomtownroi.com:8444/display/GOAT/Bulk+Sprint+8+Retro what';
    let output = text.replace(Todo.linkRegex, '<a class="external" href="$1">$1</a> ');

    // should do nothing and not get fooled by http/
    const http = 'something using http/2';
    const httpOutput = http.replace(Todo.linkRegex, '<$1>');
    assert(httpOutput === http);  
  });

  it('skips contexts when in urls', function() {
    // shouldn't get tripped up on the @chris.g.chiu part
    let todo = new Todo("(C) @work read https://medium.com/@chris.g.chiu/ and shit");
    assert.deepEqual(todo.contexts(), ['@work']);
  })
});

