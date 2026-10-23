/* Trello Power-Up entry point. The local demo UI works without Trello credentials. */
const APP_URL = new URL('../', window.location.href).toString();
window.TrelloPowerUp.initialize({
  'board-buttons': function (t) {
    return [{
      text: 'Saved Filters',
      condition: 'always',
      callback: function (t) {
        return t.modal({ title: 'Saved Filter Views', url: APP_URL, fullscreen: true });
      }
    }];
  }
});
