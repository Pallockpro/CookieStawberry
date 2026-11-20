// Keeps Cookie Clicker progress saved in this browser (localStorage) and
// adds a backup copy plus download/upload of save files.
(function () {
  var BACKUP_KEY = 'CookieStawberryBackup';
  var GAME_KEY = 'CookieClickerGame';
  var restored = false;

  function $(id) { return document.getElementById(id); }
  function status(msg) { var s = $('ssStatus'); if (s) s.textContent = msg; }
  function ready() { return typeof Game !== 'undefined' && Game && Game.ready && typeof Game.WriteSave === 'function'; }
  function store(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function fetchKey(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function saveString() {
    try { var s = Game.WriteSave(1); if (s) return String(s); } catch (e) {}
    return fetchKey(GAME_KEY);
  }

  function loadString(str) {
    str = String(str || '').trim();
    if (!str) return false;
    try {
      if (typeof Game.ImportSaveCode === 'function') Game.ImportSaveCode(str);
      else Game.LoadSave(str);
      Game.WriteSave();
      store(BACKUP_KEY, str);
      return true;
    } catch (e) { return false; }
  }

  function saveNow(quiet) {
    if (!ready()) return;
    try { Game.WriteSave(); } catch (e) {}
    var s = saveString();
    if (s) store(BACKUP_KEY, s);
    if (!quiet) status('Saved ' + new Date().toLocaleTimeString());
  }

  // Wait for the game, then restore from backup if the main save went missing.
  var waiter = setInterval(function () {
    if (!ready()) return;
    clearInterval(waiter);
    if (!restored && !fetchKey(GAME_KEY) && fetchKey(BACKUP_KEY)) {
      restored = loadString(fetchKey(BACKUP_KEY));
    }
    status(restored ? 'Progress restored from backup' : 'Autosave on');
    setInterval(function () { saveNow(true); status('Autosaved ' + new Date().toLocaleTimeString()); }, 30000);
  }, 500);

  window.addEventListener('beforeunload', function () { saveNow(true); });
  window.addEventListener('pagehide', function () { saveNow(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveNow(true); });

  $('ssToggle').onclick = function () { $('ssPanel').classList.toggle('open'); };
  $('ssSave').onclick = function () { ready() ? saveNow(false) : status('Game not loaded yet'); };
  $('ssExport').onclick = function () {
    if (!ready()) return status('Game not loaded yet');
    saveNow(true);
    var blob = new Blob([saveString() || ''], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cookie-save-' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    status('Save downloaded');
  };
  $('ssImport').onclick = function () { $('ssFile').click(); };
  $('ssFile').onchange = function () {
    var f = this.files && this.files[0]; this.value = '';
    if (!f) return;
    if (!ready()) return status('Game not loaded yet');
    var r = new FileReader();
    r.onload = function () { status(loadString(r.result) ? 'Save loaded!' : 'Could not read that save'); };
    r.readAsText(f);
  };
})();
