// CookieStawberry strawberry theme: pink cookie, pink background, strawberry milk,
// plus a golden cookie alert. Works by swapping tinted copies into the game's image library.
(function () {
  var U = window.SSUtil;
  var KEY = 'CookieStawberryTheme';
  function $(id) { return document.getElementById(id); }

  var cfg = { skin: true, milk: true, goldAlert: true };
  try { var s = JSON.parse(U.get(KEY) || '{}'); for (var k in s) cfg[k] = s[k]; } catch (e) {}
  function persist() { U.set(KEY, JSON.stringify(cfg)); }

  // name -> how to tint it. 'color' keeps the light/dark detail and replaces the colour,
  // 'hue' keeps the image's own saturation (good for the striped background).
  var TINTS = {
    'perfectCookie.png': { mode: 'color', color: '#ff6f9a', strength: 0.85 },
    'cookieShower1.png': { mode: 'color', color: '#ff6f9a', strength: 0.85 },
    'cookieShower2.png': { mode: 'color', color: '#ff6f9a', strength: 0.85 },
    'cookieShower3.png': { mode: 'color', color: '#ff6f9a', strength: 0.85 },
    'smallCookies.png':  { mode: 'color', color: '#ff6f9a', strength: 0.85 },
    'shine.png':         { mode: 'color', color: '#ffc2d4', strength: 1 },
    'bgBlue.jpg':        { mode: 'hue',   color: '#e0457a', strength: 1, darken: 0.12 }
  };
  var originals = {};   // name -> original image
  var tinted = {};      // name -> tinted canvas

  function L() { return Game.Loader; }
  function isLoaded(name) {
    var a = L().assets[name];
    return L().assetsLoaded.indexOf(name) >= 0 && a && (a.naturalWidth || a.width);
  }

  function tint(img, t) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = t.mode;      // 'color' / 'hue' blend modes (supported in Safari)
    x.globalAlpha = t.strength;
    x.fillStyle = t.color;
    x.fillRect(0, 0, w, h);
    if (t.darken) {
      x.globalCompositeOperation = 'multiply'; x.globalAlpha = t.darken;
      x.fillStyle = '#7a1f3d'; x.fillRect(0, 0, w, h);
    }
    // Put the original transparency back (the fill coloured the empty areas too).
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(img, 0, 0);
    return c;
  }

  function applySkin() {
    if (!U.ready()) return false;
    var done = true;
    for (var name in TINTS) {
      if (cfg.skin) {
        if (L().assets[name] === tinted[name] && tinted[name]) continue;
        if (!isLoaded(name)) {
          if (L().assetsLoading.indexOf(name) < 0) L().Load([name]);
          done = false; continue;
        }
        if (!originals[name]) originals[name] = L().assets[name];
        try { tinted[name] = tinted[name] || tint(originals[name], TINTS[name]); } catch (e) { continue; }
        L().assets[name] = tinted[name];
      } else if (originals[name]) {
        L().assets[name] = originals[name];
      }
    }
    return done;
  }

  // ---------- Strawberry milk ----------
  var milkOriginals = null;
  function applyMilk() {
    if (!U.ready() || !Game.Milks) return false;
    var straw = 'milkStrawberry.png';
    var names = [];
    Game.Milks.forEach(function (m) { if (m && m.pic) names.push(m.pic + '.png'); });
    if (Game.MilksByChoice) for (var i in Game.MilksByChoice) if (Game.MilksByChoice[i].pic) names.push(Game.MilksByChoice[i].pic + '.png');
    if (cfg.milk) {
      if (!isLoaded(straw)) { if (L().assetsLoading.indexOf(straw) < 0) L().Load([straw]); return false; }
      var img = L().assets[straw];
      if (!milkOriginals) milkOriginals = {};
      names.forEach(function (n) {
        if (n === straw) return;
        if (!(n in milkOriginals)) milkOriginals[n] = { img: L().assets[n], loaded: L().assetsLoaded.indexOf(n) >= 0 };
        L().assets[n] = img;
        if (L().assetsLoaded.indexOf(n) < 0) L().assetsLoaded.push(n);
      });
    } else if (milkOriginals) {
      for (var n in milkOriginals) {
        var o = milkOriginals[n];
        if (o.loaded && o.img) L().assets[n] = o.img;
        else { delete L().assets[n]; var at = L().assetsLoaded.indexOf(n); if (at >= 0) L().assetsLoaded.splice(at, 1); }
      }
      milkOriginals = null;
    }
    return true;
  }

  // Keep trying until every image has loaded, then check now and then (seasons/backgrounds can change).
  setInterval(function () {
    if (!U.ready()) return;
    document.body.classList.toggle('ssStrawberry', !!cfg.skin);
    applySkin();
    applyMilk();
  }, 700);

  // ---------- Golden cookie alert ----------
  var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
  var baseTitle = null, titleTimer = null;
  setInterval(function () {
    if (!U.ready() || !cfg.goldAlert || !seen || !Game.shimmers) return;
    Game.shimmers.forEach(function (sh) {
      if (sh.type !== 'golden' || seen.has(sh)) return;
      seen.add(sh);
      U.toast(sh.wrath ? '😈 A wrath cookie appeared!' : '🌟 A golden cookie appeared!');
      var bar = $('topBar'); if (bar) { bar.classList.remove('ssGoldFlash'); void bar.offsetWidth; bar.classList.add('ssGoldFlash'); }
      // The game rewrites the tab title every few seconds; ours wins for a short while.
      clearInterval(titleTimer);
      var n = 0;
      titleTimer = setInterval(function () {
        if (++n > 8 || Game.shimmers.indexOf(sh) < 0) { clearInterval(titleTimer); return; }
        document.title = (n % 2 ? '🌟 Golden cookie! ' : '✨ ') + (document.title.replace(/^(🌟 Golden cookie! |✨ )/, ''));
      }, 700);
    });
  }, 500);

  // ---------- Settings ----------
  [['ssSkin', 'skin', 'Strawberry look'], ['ssMilk', 'milk', 'Strawberry milk'], ['ssGoldAlert', 'goldAlert', 'Golden cookie alert']].forEach(function (p) {
    var el = $(p[0]); if (!el) return;
    el.checked = !!cfg[p[1]];
    el.onchange = function () {
      cfg[p[1]] = this.checked; persist();
      applySkin(); applyMilk();
      document.body.classList.toggle('ssStrawberry', !!cfg.skin);
      U.toast(p[2] + (this.checked ? ' on' : ' off'));
    };
  });
  document.body.classList.toggle('ssStrawberry', !!cfg.skin);
})();
