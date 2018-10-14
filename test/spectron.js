const assert = require('assert');
const { Application } = require('spectron');
const electronPath = require('electron');
const path = require('path');

// good shit at http://www.matthiassommer.it/desktop/integration-e2e-test-electron-mocha-spectron-chai/
describe('App launch', function() {

  this.timeout(10000);

  before(function() {
    this.app = new Application({
      path: electronPath,
      args: [path.join(__dirname, '..')]
    });
    return this.app.start();
  });

  after(function() {
    if (this.app && this.app.isRunning())
      return this.app.stop();
  });

  it('shows an initial window', function() {
    return this.app.client.waitUntilWindowLoaded().getWindowCount().then(function(count) {
      assert.equal(count, 1);
    });
  });

  it('filters on hash url', function() {
    this.app.client.url('file:///Users/frock/code/todo/index.html#A');
  });

  it('goes to priority A', function() {
    return this.app.client.element('#priorityA').click();
  });

  it('has an item', function() {
    return this.app.client.waitForExist('ul li:first-child');
  });

  // add item, ensure it's at top
  it('adds a todo and lists the new item');
  it('filters by context correctly');
  it('clears filter and views correct hash');
  // special test seed data?

});
