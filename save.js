// CookieStawberry extras: autosave + backup, save files, credits popup, settings (fast mode).
(function () {
  var BACKUP_KEY = 'CookieStawberryBackup';
  var GAME_KEY = 'CookieClickerGame';
  var SET_KEY = 'CookieStawberrySettings';
  var SPLASH_KEY = 'CookieStawberryHideSplash';
  // Game prefs fast mode turns off (only the ones this game version has are touched).
  var FAST_PREFS = ['fancy', 'filters', 'particles', 'numbers', 'milk', 'cursors', 'wobbly', 'animate'];

  function $(id) { return document.getElementById(id); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function ready() { return typeof Game !== 'undefined' && Game && Game.ready && typeof Game.WriteSave === 'function'; }

  var settings = { fast: false, interval: 30, hideTop: false, savedPrefs: null };
  try { var s = JSON.parse(get(SET_KEY) || '{}'); for (var k in s) settings[k] = s[k]; } catch (e) {}
  function persist() { set(SET_KEY, JSON.stringify(settings)); }

  var toastTimer;
  function toast(msg) {
    var t = $('ssToast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function status(msg) { $('ssStatus').textContent = msg; }

  // ---------- Saving ----------
  function saveString() {
    try { var s = Game.WriteSave(1); if (s) return String(s); } catch (e) {}
    return get(GAME_KEY);
  }
  function loadString(str) {
    str = String(str || '').trim();
    if (!str) return false;
    try {
      if (typeof Game.ImportSaveCode === 'function') Game.ImportSaveCode(str);
      else Game.LoadSave(str);
      Game.WriteSave();
      set(BACKUP_KEY, str);
      applyFast(); // a loaded save brings its own prefs back
      return true;
    } catch (e) { return false; }
  }
  function saveNow() {
    if (!ready()) return false;
    try { Game.WriteSave(); } catch (e) {}
    var s = saveString();
    if (s) set(BACKUP_KEY, s);
    status('Last saved ' + new Date().toLocaleTimeString());
    return true;
  }

  var autoTimer;
  function startAutosave() {
    clearInterval(autoTimer);
    autoTimer = setInterval(saveNow, (+settings.interval || 30) * 1000);
  }

  // ---------- Fast mode ----------
  function refreshGame() {
    try { if (Game.ToggleFancy) Game.ToggleFancy(); } catch (e) {}
    try { if (Game.ToggleFilters) Game.ToggleFilters(); } catch (e) {}
    try { if (Game.onMenu === 'prefs' && Game.UpdateMenu) Game.UpdateMenu(); } catch (e) {}
  }
  function applyFast() {
    document.body.classList.toggle('ssFast', !!settings.fast);
    if (!ready() || !Game.prefs) return;
    if (settings.fast) {
      if (!settings.savedPrefs) {
        settings.savedPrefs = {};
        FAST_PREFS.forEach(function (p) { if (p in Game.prefs) settings.savedPrefs[p] = Game.prefs[p]; });
        persist();
      }
      FAST_PREFS.forEach(function (p) { if (p in Game.prefs) Game.prefs[p] = 0; });
    } else if (settings.savedPrefs) {
      for (var p in settings.savedPrefs) Game.prefs[p] = settings.savedPrefs[p];
      settings.savedPrefs = null; persist();
    }
    refreshGame();
  }

  function applyHideTop() { document.body.classList.toggle('ssHideTop', !!settings.hideTop); }

  // ---------- Credits popup ----------
  function showSplash() { $('ssSplashHide').checked = false; $('ssSplash').hidden = false; $('ssSplashOk').focus(); }
  $('ssSplashOk').onclick = function () {
    if ($('ssSplashHide').checked) set(SPLASH_KEY, '1');
    $('ssSplash').hidden = true;
  };
  if (get(SPLASH_KEY) !== '1') showSplash();

  // ---------- Startup ----------
  applyHideTop();
  document.body.classList.toggle('ssFast', !!settings.fast);
  var waiter = setInterval(function () {
    if (!ready()) return;
    clearInterval(waiter);
    var restored = false;
    if (!get(GAME_KEY) && get(BACKUP_KEY)) restored = loadString(get(BACKUP_KEY));
    applyFast();
    status(restored ? 'Progress restored from backup' : 'Autosave on');
    startAutosave();
  }, 500);

  window.addEventListener('beforeunload', saveNow);
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveNow(); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault(); toast(saveNow() ? 'Game saved' : 'Game not loaded yet');
    }
  });

  // ---------- Toolbar ----------
  function togglePanel(id) {
    ['ssSaveBody', 'ssSetBody'].forEach(function (b) {
      var el = $(b); el.classList.toggle('open', b === id ? !el.classList.contains('open') : false);
    });
  }
  $('ssSaveBtn').onclick = function () { togglePanel('ssSaveBody'); };
  $('ssSetBtn').onclick = function () { togglePanel('ssSetBody'); };

  $('ssSave').onclick = function () { toast(saveNow() ? 'Game saved' : 'Game not loaded yet'); };
  $('ssExport').onclick = function () {
    if (!saveNow()) return toast('Game not loaded yet');
    var blob = new Blob([saveString() || ''], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cookie-save-' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('Save downloaded');
  };
  $('ssImport').onclick = function () { $('ssFile').click(); };
  $('ssFile').onchange = function () {
    var f = this.files && this.files[0]; this.value = '';
    if (!f) return;
    if (!ready()) return toast('Game not loaded yet');
    var r = new FileReader();
    r.onload = function () { toast(loadString(r.result) ? 'Save loaded!' : 'Could not read that save'); };
    r.readAsText(f);
  };

  $('ssFast').checked = !!settings.fast;
  $('ssFast').onchange = function () {
    settings.fast = this.checked; persist(); applyFast();
    toast('Fast mode ' + (settings.fast ? 'on' : 'off'));
  };
  $('ssInterval').value = String(settings.interval);
  $('ssInterval').onchange = function () { settings.interval = +this.value; persist(); startAutosave(); toast('Autosave every ' + this.value + 's'); };
  $('ssHideTop').checked = !!settings.hideTop;
  $('ssHideTop').onchange = function () { settings.hideTop = this.checked; persist(); applyHideTop(); };
  $('ssCredits').onclick = function () { set(SPLASH_KEY, '0'); showSplash(); };
})();
