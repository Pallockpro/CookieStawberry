// CookieStawberry extras: autosave + backup, save files, credits popup, settings (fast mode).
(function () {
  var BACKUP_KEY = 'CookieStawberryBackup';
  // The game's own save slot (Game.SaveTo when available).
  function gameKey() { return (typeof Game !== 'undefined' && Game && Game.SaveTo) || 'CookieClickerGame'; }
  var SET_KEY = 'CookieStawberrySettings';
  var SPLASH_KEY = 'CookieStawberryHideSplash';
  // Game prefs fast mode turns off (only the ones this game version has are touched).
  // Not 'animate': with it off the game never draws the building scenes (they go black).
  // The 'Building scenes' setting handles that instead.
  var FAST_PREFS = ['fancy', 'filters', 'particles', 'numbers', 'milk', 'cursors', 'wobbly'];

  function $(id) { return document.getElementById(id); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function ready() { return typeof Game !== 'undefined' && Game && Game.ready && typeof Game.WriteSave === 'function'; }

  var settings = { fast: false, interval: 30, hideTop: false, savedPrefs: null,
    scenes: 'full', smooth: true, fps: 30, showFps: false, muteClicks: false };
  try { var s = JSON.parse(get(SET_KEY) || '{}'); for (var k in s) settings[k] = s[k]; } catch (e) {}
  // Older versions had an on/off "hide building scenes"; show them at low fps instead of blank.
  if (settings.hideRows !== undefined) { if (settings.hideRows) settings.scenes = 'low'; delete settings.hideRows; }
  if (['full', 'low', 'off'].indexOf(settings.scenes) < 0) settings.scenes = 'full';
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
    return get(gameKey());
  }
  function loadString(str) {
    str = String(str || '').trim();
    if (!str) return false;
    try {
      if (typeof Game.ImportSaveCode === 'function') Game.ImportSaveCode(str);
      else Game.LoadSave(str);
      Game.WriteSave();
      set(BACKUP_KEY, str);
      applyPerf(); // a loaded save brings its own prefs back
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
      // Undo older versions of fast mode that switched building animation off.
      if (settings.savedPrefs.animate !== undefined) {
        Game.prefs.animate = settings.savedPrefs.animate;
        delete settings.savedPrefs.animate; persist();
      }
    } else if (settings.savedPrefs) {
      for (var p in settings.savedPrefs) Game.prefs[p] = settings.savedPrefs[p];
      settings.savedPrefs = null; persist();
    }
    refreshGame();
  }


  // ---------- Performance ----------
  // 1) Smooth frame pacing: the game schedules its loop with setTimeout, which
  //    jitters badly on iPad Safari. Route it through requestAnimationFrame
  //    (throttled to the game's fps so 120Hz screens don't speed the game up).
  var nativeTimeout = window.setTimeout;
  var lastLoop = 0;
  window.setTimeout = function (fn, delay) {
    if (settings.smooth && !document.hidden && typeof Game !== 'undefined' && Game && fn === Game.Loop
        && typeof requestAnimationFrame === 'function') {
      var step = 1000 / (Game.fps || 30);
      var tick = function (now) {
        if (document.hidden) { nativeTimeout(fn, 0); return; }
        if (now - lastLoop < step - 2) { requestAnimationFrame(tick); return; }
        lastLoop = now;
        fn();
      };
      requestAnimationFrame(tick);
      return 0;
    }
    return nativeTimeout.apply(window, arguments);
  };

  // 2) Frame rate. Everything in the game scales with Game.fps, so 60 makes it
  //    smoother without changing game speed (but costs more CPU).
  function applyFps() {
    if (!ready()) return;
    var f = +settings.fps === 60 ? 60 : 30;
    if (Game.fps !== f) Game.fps = f;
  }

  // 3) Building scenes (the middle column): animated, low fps (redrawn ~1x per second), or hidden.
  var sceneDraws = null, sceneLast = {};
  function applyRows() {
    document.body.classList.toggle('ssHideRows', settings.scenes === 'off');
    if (!ready() || !Game.Objects) return;
    if (!sceneDraws) {
      sceneDraws = {};
      for (var k in Game.Objects) (function (name, o) {
        if (!o || typeof o.draw !== 'function') return;
        var orig = sceneDraws[name] = o.draw;
        o.draw = function () {
          if (settings.scenes === 'off') return;
          if (settings.scenes === 'low') {
            var now = Date.now();
            if (now - (sceneLast[name] || 0) < 1000) return;
            sceneLast[name] = now;
          }
          return orig.apply(this, arguments);
        };
      })(k, Game.Objects[k]);
    }
    sceneLast = {}; // redraw straight away after a change
  }

  // 4) FPS counter (counts real frames the game draws).
  var frames = 0, drawHooked = false;
  function hookDraw() {
    if (drawHooked || !ready() || typeof Game.Draw !== 'function') return;
    var d = Game.Draw;
    Game.Draw = function () { frames++; return d.apply(this, arguments); };
    drawHooked = true;
  }
  setInterval(function () {
    var m = $('ssFpsMeter');
    m.hidden = !settings.showFps;
    if (settings.showFps && drawHooked) {
      var target = ready() ? Game.fps : 30;
      m.textContent = frames + ' / ' + target + ' fps';
      m.className = frames >= target * 0.9 ? '' : frames >= target * 0.7 ? 'mid' : 'low';
    }
    frames = 0;
  }, 1000);

  // 5) Mute click sounds. iPad Safari is slow at starting a sound on every tap,
  //    which is the main source of lag while clicking the cookie.
  var soundHooked = false;
  function isClickSound(url) { return /click/i.test(String(url || '')); }
  function hookSound() {
    if (soundHooked || !ready()) return;
    if (typeof window.PlaySound === 'function') {
      var ps = window.PlaySound;
      window.PlaySound = function (url) {
        if (settings.muteClicks && isClickSound(url)) return;
        return ps.apply(this, arguments);
      };
    }
    if (typeof Game.playCookieClickSound === 'function') {
      var pc = Game.playCookieClickSound;
      Game.playCookieClickSound = function () { if (!settings.muteClicks) return pc.apply(this, arguments); };
    }
    soundHooked = true;
  }

  function applyPerf() { applyFast(); applyRows(); applyFps(); hookDraw(); hookSound(); }

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
  document.body.classList.toggle('ssHideRows', settings.scenes === 'off');
  var waiter = setInterval(function () {
    if (!ready()) return;
    clearInterval(waiter);
    var restored = false;
    if (!get(gameKey()) && get(BACKUP_KEY)) restored = loadString(get(BACKUP_KEY));
    applyPerf();
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


  // ---------- No accidental zoom on phones/tablets ----------
  // iOS ignores user-scalable=no, so block pinch and double-tap zoom directly.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault();
  }, { passive: false });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
  // Trackpad pinch / Ctrl + wheel zoom
  document.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });

  // ---------- Toolbar ----------
  function togglePanel(id) {
    ['ssSaveBody', 'ssSetBody', 'ssAutoBody', 'ssAdminBody'].forEach(function (b) {
      var el = $(b); el.classList.toggle('open', b === id ? !el.classList.contains('open') : false);
    });
  }
  $('ssSaveBtn').onclick = function () { togglePanel('ssSaveBody'); };
  $('ssSetBtn').onclick = function () { togglePanel('ssSetBody'); };
  $('ssAutoBtn').onclick = function () { togglePanel('ssAutoBody'); };
  $('ssAdminBtn').onclick = function () { togglePanel('ssAdminBody'); };
  window.SSUtil = { toast: toast, ready: ready, get: get, set: set, togglePanel: togglePanel };

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


  function syncUI() {
    $('ssFast').checked = !!settings.fast;
    $('ssScenes').value = settings.scenes;
    $('ssSmooth').checked = !!settings.smooth;
    $('ssFps').value = String(settings.fps);
    $('ssShowFps').checked = !!settings.showFps;
    $('ssMuteClicks').checked = !!settings.muteClicks;
  }
  syncUI();
  $('ssScenes').onchange = function () { settings.scenes = this.value; persist(); applyRows(); toast('Building scenes: ' + this.options[this.selectedIndex].text); };
  $('ssSmooth').onchange = function () { settings.smooth = this.checked; persist(); toast('Smooth pacing ' + (this.checked ? 'on' : 'off')); };
  $('ssFps').onchange = function () { settings.fps = +this.value; persist(); applyFps(); toast(this.value + ' fps'); };
  $('ssMuteClicks').onchange = function () { settings.muteClicks = this.checked; persist(); hookSound(); toast('Click sounds ' + (this.checked ? 'muted' : 'on')); };
  $('ssShowFps').onchange = function () { settings.showFps = this.checked; persist(); };
  $('ssBoost').onclick = function () {
    settings.fast = true; settings.scenes = 'low'; settings.smooth = true; settings.showFps = true; settings.muteClicks = true;
    persist(); applyPerf(); syncUI();
    toast('Boost on - try 60 fps if the counter stays green');
  };
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
