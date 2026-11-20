// CookieStawberry extras: flying strawberry bonus cookies, golden cookie frequency,
// "next golden cookie" countdown, and small fixes for this copy of the game.
(function () {
  var U = window.SSUtil;
  var KEY = 'CookieStawberryExtras';
  var IMG = 'https://cdn.jsdelivr.net/gh/bcat1023/webprx@8b966f57aeceb9616de5f15455d811ab76df9c8f/gfiles/cookies/img/';
  var SND = 'https://cdn.jsdelivr.net/gh/bcat1023/webprx@8b966f57aeceb9616de5f15455d811ab76df9c8f/gfiles/cookies/snd/shimmerClick.mp3';
  function $(id) { return document.getElementById(id); }

  var cfg = { freq: 1, gold: 1, caught: 0, missed: 0, best: 0 };
  try { var s = JSON.parse(U.get(KEY) || '{}'); for (var k in s) cfg[k] = s[k]; } catch (e) {}
  function persist() { U.set(KEY, JSON.stringify(cfg)); }

  function busy() { return !U.ready() || Game.OnAscend || Game.AscendTimer > 0 || document.hidden; }
  function fmt(n) { try { return Beautify(n); } catch (e) { return Math.round(n).toLocaleString(); } }

  // ---------- Flying strawberry cookies ----------
  var layer = document.createElement('div');
  layer.id = 'sbLayer';
  document.body.appendChild(layer);
  var flying = [];
  var nextSpawn = Date.now() + delay();

  function delay() {
    var f = +cfg.freq;
    var min = f === 2 ? 20 : 50, max = f === 2 ? 45 : 110; // seconds
    return (min + Math.random() * (max - min)) * 1000;
  }

  function spawn() {
    var W = window.innerWidth, H = window.innerHeight;
    var fromLeft = Math.random() < 0.5;
    var c = {
      el: document.createElement('button'),
      x0: fromLeft ? -50 : W + 50, x1: fromLeft ? W + 50 : -50,
      y: H * (0.25 + Math.random() * 0.5), amp: 30 + Math.random() * 70, waves: 1 + Math.random() * 1.5,
      dur: 6500 + Math.random() * 2500, start: performance.now(), spin: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 180)
    };
    c.el.className = 'sbCookie';
    c.el.setAttribute('aria-label', 'Strawberry cookie - tap for a bonus');
    c.el.innerHTML = '<span class="sbImg"></span><span class="sbBerry">&#127827;</span>';
    c.el.querySelector('.sbImg').style.backgroundImage = 'url(' + IMG + 'goldCookie.png)';
    var hit = function (e) { if (e) { e.preventDefault(); e.stopPropagation(); } catchIt(c, e); };
    c.el.addEventListener('touchstart', hit, { passive: false });
    c.el.addEventListener('mousedown', hit);
    layer.appendChild(c.el);
    flying.push(c);
    if (!rafOn) { rafOn = true; requestAnimationFrame(frame); }
  }

  var rafOn = false;
  function frame(now) {
    for (var i = flying.length - 1; i >= 0; i--) {
      var c = flying[i];
      if (c.done) { flying.splice(i, 1); continue; }
      var t = (now - c.start) / c.dur;
      if (t >= 1) { miss(c); flying.splice(i, 1); continue; }
      var x = c.x0 + (c.x1 - c.x0) * t;
      var y = c.y + Math.sin(t * Math.PI * 2 * c.waves) * c.amp;
      c.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (c.spin * t).toFixed(1) + 'deg)';
    }
    if (flying.length) requestAnimationFrame(frame); else rafOn = false;
  }

  function burst(text, x, y) {
    var b = document.createElement('div');
    b.className = 'sbBurst';
    b.textContent = text;
    b.style.left = x + 'px'; b.style.top = y + 'px';
    document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 1700);
  }

  function reward() {
    var cps = Game.cookiesPs || 0;
    var mouse = typeof Game.computedMouseCps === 'number' ? Game.computedMouseCps : 1;
    var roll = Math.random();
    if (roll < 0.12 && Game.gainBuff) {
      Game.gainBuff('frenzy', 30, 7);
      return 'Strawberry frenzy! x7 for 30s';
    }
    if (roll < 0.22 && Game.gainBuff) {
      Game.gainBuff('click frenzy', 13, 777);
      return 'Strawberry click frenzy! x777 clicks';
    }
    var secs = 60 + Math.random() * 120;
    var amount = Math.max(cps * secs, mouse * 25, 25);
    Game.Earn(amount);
    if (amount > cfg.best) cfg.best = amount;
    return '+' + fmt(amount) + ' cookies';
  }

  function catchIt(c, e) {
    if (c.done) return;
    c.done = true;
    var r = c.el.getBoundingClientRect();
    var text = 'Strawberry!';
    try { text = reward(); } catch (err) {}
    try { PlaySound(SND, 0.5); } catch (err) {}
    burst(text, r.left + r.width / 2, r.top + r.height / 2);
    U.toast('🍓 ' + text);
    cfg.caught++; persist(); showStats();
    c.el.classList.add('sbGone');
    c.el.style.transform += ' scale(1.6)';
    setTimeout(function () { c.el.remove(); }, 400);
  }

  function miss(c) {
    c.done = true;
    c.el.remove();
    cfg.missed++; persist(); showStats();
  }

  // Lets Auto Buy pop these too.
  window.SSStraw = { spawn: function () { spawn(); }, popAll: function () { flying.slice().forEach(function (c) { if (!c.done) catchIt(c); }); } };

  setInterval(function () {
    if (!+cfg.freq || busy()) { nextSpawn = Math.max(nextSpawn, Date.now() + 5000); return; }
    if (Date.now() >= nextSpawn) { spawn(); nextSpawn = Date.now() + delay(); }
  }, 1000);

  // ---------- Golden cookie frequency ----------
  var goldHooked = false;
  function hookGold() {
    if (goldHooked || !U.ready() || !Game.shimmerTypes || !Game.shimmerTypes.golden) return;
    var g = Game.shimmerTypes.golden, orig = g.getTimeMod;
    g.getTimeMod = function (me, m) { return orig.call(this, me, m / (+cfg.gold || 1)); };
    goldHooked = true;
    retime();
  }
  function retime() {
    if (!goldHooked) return;
    var g = Game.shimmerTypes.golden;
    g.minTime = g.getMinTime(g);
    g.maxTime = g.getMaxTime(g);
  }

  function clock(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function goldInfo() {
    var el = $('sbGoldInfo');
    if (!U.ready() || !Game.shimmerTypes) { el.textContent = 'Next golden cookie: waiting for game...'; return; }
    var g = Game.shimmerTypes.golden, fps = Game.fps || 30;
    var onScreen = (Game.shimmers || []).some(function (s) { return s.type === 'golden'; });
    if (onScreen) { el.textContent = '✨ A golden cookie is on screen now!'; return; }
    if (Game.Has && Game.Has('Golden switch [off]')) { el.textContent = 'Golden cookies are off (Golden switch)'; return; }
    var a = (g.minTime - g.time) / fps, b = (g.maxTime - g.time) / fps;
    el.textContent = a > 0 ? 'Next golden cookie: in ' + clock(a) + ' to ' + clock(b)
                           : 'Next golden cookie: any moment (by ' + clock(b) + ')';
  }

  function showStats() {
    $('sbStats').textContent = 'Strawberries caught: ' + cfg.caught + ' · missed: ' + cfg.missed;
  }

  // ---------- Startup ----------
  var waiter = setInterval(function () {
    if (!U.ready()) return;
    clearInterval(waiter);
    hookGold();
    // This copy can't reach the game's Patreon server; stop it retrying (it only causes 404s).
    try { Game.GrabData = function () {}; } catch (e) {}
  }, 500);
  setInterval(function () { if ($('ssSetBody').classList.contains('open')) goldInfo(); }, 1000);

  // ---------- Auto-close game popups (the game's own "short notifications" option) ----------
  function applyShortNotes() {
    if (!U.ready() || !Game.prefs || cfg.shortNotes === undefined) return;
    Game.prefs.notifs = cfg.shortNotes ? 1 : 0;
  }
  var notesWaiter = setInterval(function () {
    if (!U.ready()) return;
    clearInterval(notesWaiter);
    if (cfg.shortNotes === undefined) cfg.shortNotes = !!Game.prefs.notifs;
    applyShortNotes();
    $('ssShortNotes').checked = !!cfg.shortNotes;
  }, 500);
  $('ssShortNotes').onchange = function () {
    cfg.shortNotes = this.checked; persist(); applyShortNotes();
    if (cfg.shortNotes && Game.CloseNotes) try { Game.CloseNotes(); } catch (e) {}
    U.toast('Game popups ' + (cfg.shortNotes ? 'auto-close' : 'stay open'));
  };

  // ---------- Embedded in another site (e.g. Google Sites) ----------
  // Show a button to open the game on its own page, where it gets the whole screen.
  var embedded = false;
  try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
  if (embedded) { $('ssFullPage').hidden = false; document.body.classList.add('ssEmbedded'); }

  $('sbFreq').value = String(cfg.freq);
  $('sbFreq').onchange = function () {
    cfg.freq = +this.value; persist();
    nextSpawn = Date.now() + (cfg.freq ? 3000 : 0); // show one soon so it's clear it works
    U.toast(cfg.freq ? 'Strawberry cookies on' : 'Strawberry cookies off');
  };
  $('sbGold').value = String(cfg.gold);
  $('sbGold').onchange = function () { cfg.gold = +this.value; persist(); retime(); goldInfo(); U.toast('Golden cookies: ' + this.options[this.selectedIndex].text); };
  showStats();
  goldInfo();
})();
