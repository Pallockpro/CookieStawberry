// CookieStawberry new content: the "Claude" building, its upgrades, strawberry achievements
// (some hidden) and the secret strawberry tricks that unlock them.
// The game reads its save before this runs, so everything here keeps its own save slot.
(function () {
  var U = window.SSUtil;
  var KEY = 'CookieStawberryContent';
  function $(id) { return document.getElementById(id); }

  var data = { claude: null, ach: [], upg: [], caught: 0, missed: 0, pinkClicks: 0, autoBought: 0 };
  try { var s = JSON.parse(U.get(KEY) || '{}'); for (var k in s) data[k] = s[k]; } catch (e) {}
  function persist() { U.set(KEY, JSON.stringify(data)); }

  // ================= Icons (drawn here, so no image files are needed) =================
  var CLAUDE = '#D97757';
  function berry(x, cx, cy, r, body) {
    x.save();
    x.fillStyle = body || '#e8323f';
    x.beginPath();
    x.moveTo(cx, cy + r);
    x.bezierCurveTo(cx - r * 1.25, cy + r * 0.2, cx - r * 1.05, cy - r * 0.95, cx, cy - r * 0.62);
    x.bezierCurveTo(cx + r * 1.05, cy - r * 0.95, cx + r * 1.25, cy + r * 0.2, cx, cy + r);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,.25)';
    x.beginPath(); x.ellipse(cx - r * 0.35, cy - r * 0.2, r * 0.18, r * 0.32, -0.5, 0, 6.3); x.fill();
    x.fillStyle = '#ffe28a';
    var seeds = [[-.4, -.05], [0, -.15], [.4, -.05], [-.2, .3], [.2, .3], [0, .62], [-.55, .3], [.55, .3]];
    seeds.forEach(function (p) { x.beginPath(); x.ellipse(cx + p[0] * r, cy + p[1] * r, r * .06, r * .1, 0, 0, 6.3); x.fill(); });
    x.fillStyle = '#3fae49';
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + (i - 2) * 0.55;
      x.beginPath(); x.ellipse(cx + Math.cos(a) * r * .32, cy - r * .62 + Math.sin(a) * r * .22 + r * .12, r * .32, r * .12, a, 0, 6.3); x.fill();
    }
    x.restore();
  }
  function spark(x, cx, cy, r, color) {
    // A burst of rounded rays, in the style of the Claude logo.
    x.save(); x.translate(cx, cy); x.fillStyle = color || CLAUDE;
    var rays = 12;
    for (var i = 0; i < rays; i++) {
      var len = r * (i % 2 ? 0.82 : 1), w = r * 0.17;
      x.save(); x.rotate(i * Math.PI * 2 / rays);
      x.beginPath();
      x.moveTo(-w * 0.5, 0); x.lineTo(-w * 0.32, -len + w * 0.4);
      x.quadraticCurveTo(0, -len - w * 0.2, w * 0.32, -len + w * 0.4);
      x.lineTo(w * 0.5, 0); x.closePath(); x.fill();
      x.restore();
    }
    x.beginPath(); x.arc(0, 0, r * 0.22, 0, 6.3); x.fill();
    x.restore();
  }
  function disc(x, cx, cy, r, color) { x.fillStyle = color; x.beginPath(); x.arc(cx, cy, r, 0, 6.3); x.fill(); }
  function label(x, text, cx, cy, size, color) {
    x.save(); x.font = 'bold ' + size + 'px Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 3; x.strokeStyle = '#000'; x.strokeText(text, cx, cy); x.fillStyle = color || '#fff'; x.fillText(text, cx, cy);
    x.restore();
  }
  function ring(x, color) { x.strokeStyle = color; x.lineWidth = 3; x.beginPath(); x.arc(24, 24, 21, 0, 6.3); x.stroke(); }

  // Each entry draws one 48x48 icon.
  var ICONS = [
    /*0*/ function (x) { berry(x, 24, 25, 17); },
    /*1*/ function (x) { ring(x, '#f5c542'); berry(x, 24, 25, 15); label(x, '10', 35, 38, 12); },
    /*2*/ function (x) { berry(x, 15, 22, 10); berry(x, 33, 22, 10); berry(x, 24, 32, 11); label(x, '100', 24, 42, 10); },
    /*3*/ function (x) { x.fillStyle = '#c9e7f2'; x.fillRect(12, 14, 24, 28); x.fillStyle = '#b3123a'; x.fillRect(14, 22, 20, 18); x.fillStyle = '#e9c46a'; x.fillRect(10, 9, 28, 7); berry(x, 24, 30, 6, '#ff5c7a'); },
    /*4*/ function (x) { spark(x, 24, 24, 19); },
    /*5*/ function (x) { ring(x, '#f5c542'); spark(x, 24, 24, 16); label(x, '10', 35, 38, 12); },
    /*6*/ function (x) { disc(x, 24, 24, 22, '#3a1a10'); spark(x, 24, 24, 18, '#f5c542'); },
    /*7*/ function (x) { disc(x, 24, 24, 22, '#4a1626'); spark(x, 24, 24, 18, '#ff7aa2'); label(x, '100', 24, 40, 10); },
    /*8*/ function (x) { disc(x, 24, 24, 18, '#ff7aa2'); disc(x, 18, 19, 4, '#b3123a'); disc(x, 29, 26, 5, '#b3123a'); disc(x, 20, 31, 3, '#b3123a'); },
    /*9*/ function (x) { berry(x, 22, 26, 15); x.fillStyle = '#ffe14d'; x.beginPath(); x.moveTo(36, 6); x.lineTo(28, 24); x.lineTo(35, 24); x.lineTo(30, 42); x.lineTo(44, 20); x.lineTo(37, 20); x.lineTo(42, 6); x.fill(); },
    /*10*/ function (x) { x.fillStyle = '#9aa5b1'; x.fillRect(10, 14, 28, 24); x.fillStyle = '#2b2f36'; x.fillRect(14, 20, 8, 6); x.fillRect(26, 20, 8, 6); berry(x, 24, 36, 7); x.fillRect(22, 6, 4, 8); },
    /*11*/ function (x) { disc(x, 17, 36, 9, '#f5c542'); disc(x, 31, 36, 9, '#e6b52f'); berry(x, 24, 20, 13); },
    /*12*/ function (x) { disc(x, 24, 24, 22, '#2a1219'); berry(x, 24, 25, 14); label(x, '?', 24, 26, 20, '#ffe14d'); },
    /*13*/ function (x) { x.fillStyle = '#f4e3c1'; x.fillRect(10, 8, 28, 34); x.fillStyle = '#b08a5a'; for (var i = 0; i < 4; i++) x.fillRect(14, 14 + i * 6, 20, 2); berry(x, 32, 36, 8); },
    /*14*/ function (x) { berry(x, 24, 25, 16); x.strokeStyle = '#000'; x.lineWidth = 5; x.beginPath(); x.moveTo(10, 10); x.lineTo(38, 38); x.moveTo(38, 10); x.lineTo(10, 38); x.stroke(); x.strokeStyle = '#ff4d4d'; x.lineWidth = 3; x.stroke(); },
    /*15*/ function (x) { disc(x, 24, 24, 22, '#14163a'); disc(x, 33, 14, 7, '#f5e9a8'); disc(x, 36, 12, 6, '#14163a'); berry(x, 21, 28, 12); },
    /*16*/ function (x) { x.fillStyle = '#f5c542'; disc(x, 16, 24, 9, '#f5c542'); disc(x, 16, 24, 4, '#2a1219'); x.fillStyle = '#f5c542'; x.fillRect(22, 21, 20, 6); x.fillRect(36, 27, 4, 7); x.fillRect(30, 27, 4, 5); },
    /*17*/ function (x) { x.fillStyle = '#b5651d'; x.fillRect(10, 22, 28, 20); x.fillStyle = '#7a2a1a'; x.beginPath(); x.moveTo(6, 24); x.lineTo(24, 8); x.lineTo(42, 24); x.fill(); berry(x, 24, 33, 7); },
    /*18*/ function (x) { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(24, 24, 19, 11, 0, 0, 6.3); x.fill(); disc(x, 24, 24, 8, '#ff4d8a'); disc(x, 24, 24, 4, '#000'); },
    /*19*/ function (x) { berry(x, 24, 25, 17, '#f5c542'); },
    /*20*/ function (x) { spark(x, 24, 24, 19); label(x, 'x2', 34, 38, 12, '#ffe14d'); },
    /*21*/ function (x) { disc(x, 24, 24, 22, '#20232b'); spark(x, 24, 24, 16); label(x, '∞', 24, 40, 14, '#9bd'); },
    /*22*/ function (x) { disc(x, 24, 24, 22, '#f2ece0'); spark(x, 24, 24, 17); },
    /*23*/ function (x) { ring(x, '#ff7aa2'); spark(x, 24, 24, 15); berry(x, 36, 36, 8); }
  ];
  var sheet = document.createElement('canvas');
  sheet.width = 48 * ICONS.length; sheet.height = 48;
  var sx = sheet.getContext('2d');
  ICONS.forEach(function (draw, i) { sx.save(); sx.translate(i * 48, 0); try { draw(sx); } catch (e) {} sx.restore(); });
  var SHEET = sheet.toDataURL('image/png');
  function icon(i) { return [i, 0, SHEET]; }

  // Building art: store icon, a 64px "bot" for the row, and a tiled background.
  function makeCanvas(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); return c; }
  var storeIcon = makeCanvas(64, 64, function (x) { disc(x, 32, 32, 30, '#2a1810'); disc(x, 32, 32, 27, '#f2ece0'); spark(x, 32, 32, 23); });
  var STORE_ICON = storeIcon.toDataURL('image/png');
  var rowBot = makeCanvas(64, 64, function (x) {
    x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(32, 58, 18, 4, 0, 0, 6.3); x.fill();
    disc(x, 32, 30, 24, '#f2ece0'); spark(x, 32, 30, 20);
  });
  var rowBg = makeCanvas(128, 128, function (x) {
    var g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#2b1a2e'); g.addColorStop(1, '#1a1020');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.fillStyle = 'rgba(217,119,87,.18)';
    for (var i = 0; i < 128; i += 16) for (var j = 0; j < 128; j += 16) x.fillRect(i + 7, j + 7, 2, 2);
    x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(0, 100, 128, 28);
  });

  // ================= The Claude building =================
  var NAME = 'Claude';
  var UPGRADES = [
    { name: 'Extended thinking', desc: 'Claudes are <b>twice</b> as efficient.<q>It thinks about the cookies before baking them.</q>', need: 1, price: 50, icon: 20 },
    { name: 'Longer context window', desc: 'Claudes are <b>twice</b> as efficient.<q>Remembers every cookie it has ever baked.</q>', need: 5, price: 250, icon: 21 },
    { name: 'Constitutional baking', desc: 'Claudes are <b>twice</b> as efficient.<q>Helpful, harmless and delicious.</q>', need: 25, price: 2500, icon: 22 },
    { name: 'Strawberry fine-tuning', desc: 'Claudes are <b>twice</b> as efficient.<q>Trained exclusively on strawberry recipes.</q>', need: 50, price: 25000, icon: 23 },
    { name: 'Tool use', desc: 'Claudes are <b>twice</b> as efficient.<q>It learned to use the oven by itself.</q>', need: 100, price: 250000, icon: 20 },
    { name: 'Agent swarm', desc: 'Claudes are <b>twice</b> as efficient.<q>Claudes spinning up more Claudes to bake more cookies.</q>', need: 150, price: 2500000, icon: 21 }
  ];

  function claudeMult() {
    var m = 1;
    UPGRADES.forEach(function (u) { if (Game.Has(u.name)) m *= 2; });
    return m;
  }

  // Build the building without letting the game rewrite the whole middle column
  // (which would wipe loaded minigames like the garden).
  function createBuilding() {
    if (Game.Objects[NAME]) return Game.Objects[NAME];
    var realRows = $('rows'), realLeft = $('sectionLeftExtra');
    var tmpRows = document.createElement('div'), tmpLeft = document.createElement('div');
    realRows.id = 'ssRowsReal'; tmpRows.id = 'rows'; document.body.appendChild(tmpRows);
    if (realLeft) { realLeft.id = 'ssLeftReal'; tmpLeft.id = 'sectionLeftExtra'; document.body.appendChild(tmpLeft); }
    var obj;
    try {
      obj = new Game.Object(NAME, 'Claude|Claudes|prompted|[X] extra parameter|[X] extra parameters',
        'An AI model that has read every cookie recipe ever written, and now bakes them all at once. Politely.',
        18, 18, { pic: 'ssClaudeBot.png', bg: 'ssClaudeBg.png', xV: 24, yV: 24, w: 72, rows: 1, x: 0, y: 8 }, 1,
        function (me) { return me.baseCps * Game.GetTieredCpsMult(me) * Game.magicCpS(me.name) * claudeMult(); },
        function () { checkAch(); });
    } finally {
      realRows.id = 'rows'; tmpRows.remove();
      if (realLeft) { realLeft.id = 'sectionLeftExtra'; tmpLeft.remove(); }
    }
    // Move the row the game built into the real column, keeping every other row intact.
    var row = tmpRows.querySelector('#row' + obj.id);
    realRows.appendChild(row);
    obj.canvas = $('rowCanvas' + obj.id);
    obj.ctx = obj.canvas.getContext('2d', { alpha: false });
    obj.pics = [];
    obj.canvas.addEventListener('mouseover', function () { obj.mouseOn = true; });
    obj.canvas.addEventListener('mouseout', function () { obj.mouseOn = false; });
    obj.canvas.addEventListener('mousemove', function (e) {
      var r = this.getBoundingClientRect(); obj.mousePos[0] = e.pageX - r.left; obj.mousePos[1] = e.pageY - r.top;
    });
    var muted = $('buildingsMute');
    if (muted) muted.insertAdjacentHTML('beforeend', '<div class="tinyProductIcon" id="mutedProduct' + obj.id + '" style="display:none" onclick="Game.ObjectsById[' + obj.id + '].mute(0)"></div>');
    if (Game.foolObjects && !Game.foolObjects[NAME]) Game.foolObjects[NAME] = { name: 'Chatbot startup', desc: 'Nobody knows what it does, but the investors love it.', icon: 18 };

    // Art for the row, put straight into the game's image library.
    var L = Game.Loader;
    L.assets['ssClaudeBot.png'] = rowBot; L.assets['ssClaudeBg.png'] = rowBg;
    ['ssClaudeBot.png', 'ssClaudeBg.png'].forEach(function (n) { if (L.assetsLoaded.indexOf(n) < 0) L.assetsLoaded.push(n); });

    // Tooltip: show the Claude icon instead of the game's sprite.
    var tip = obj.tooltip;
    obj.tooltip = function () {
      var h = tip.apply(this, arguments);
      return String(h).replace(/(class="icon" style=")([^"]*)"/, '$1$2;background:url(' + STORE_ICON + ') center/64px 64px no-repeat !important;"');
    };

    // The scene-speed setting (save.js) wraps building draws once; give ours the same treatment.
    if (window.SSUtil && SSUtil.wrapDraw) SSUtil.wrapDraw(NAME, obj);

    var css = document.createElement('style');
    css.textContent = '#productIcon' + obj.id + ',#productIconOff' + obj.id + '{background:url(' + STORE_ICON + ') center/64px 64px no-repeat !important}' +
      '.product.locked #productIcon' + obj.id + '{filter:brightness(0) opacity(.7)}' +
      '#mutedProduct' + obj.id + '{background:url(' + STORE_ICON + ') center/contain no-repeat !important}';
    document.head.appendChild(css);
    Game.BuildStore();       // rebuild the store list so the new building shows up
    Game.storeToRefresh = 1; Game.recalculateGains = 1;
    return obj;
  }

  function restoreBuilding(obj) {
    var d = data.claude;
    if (!d || obj._ssRestored) { obj._ssRestored = true; return; }
    obj.amount = d.amount || 0; obj.bought = d.bought || 0; obj.free = d.free || 0;
    obj.highest = d.highest || 0; obj.totalCookies = d.totalCookies || 0; obj.level = d.level || 0;
    Game.BuildingsOwned += obj.amount;
    if (obj.amount > 0) { var r = $('row' + obj.id); if (r) r.classList.add('enabled'); }
    if (d.muted) try { obj.mute(1); } catch (e) {}
    obj._ssRestored = true;
    obj.refresh(); Game.recalculateGains = 1;
  }

  function saveBuilding() {
    var o = Game.Objects[NAME]; if (!o || !o._ssRestored) return;
    data.claude = { amount: o.amount, bought: o.bought, free: o.free, highest: o.highest, totalCookies: o.totalCookies, level: o.level, muted: o.muted ? 1 : 0 };
  }

  function createUpgrades() {
    UPGRADES.forEach(function (u, i) {
      if (Game.Upgrades[u.name]) return;
      var base = Game.Objects[NAME].basePrice;
      var up = new Game.Upgrade(u.name, u.desc, base * u.price, icon(u.icon));
      up.pool = ''; up.order = 99000 + i; up.buildingTie = Game.Objects[NAME];
      up.ssNeed = u.need;
    });
    // Restore what was unlocked/bought before.
    (data.upg || []).forEach(function (s) {
      var up = Game.Upgrades[s.n]; if (!up) return;
      up.unlocked = s.u ? 1 : 0;
      if (s.b && !up.bought) { up.bought = 1; Game.UpgradesOwned++; }
    });
    Game.upgradesToRebuild = 1; Game.recalculateGains = 1;
  }
  function saveUpgrades() {
    data.upg = UPGRADES.map(function (u) { var up = Game.Upgrades[u.name]; return up ? { n: u.name, u: up.unlocked, b: up.bought } : null; }).filter(Boolean);
  }

  // ================= Achievements =================
  var ACH = [
    { n: 'Berry nice', d: 'Catch your first <b>strawberry cookie</b>.', i: 0, t: function () { return data.caught >= 1; } },
    { n: 'Berry picker', d: 'Catch <b>10</b> strawberry cookies.', i: 1, t: function () { return data.caught >= 10; } },
    { n: 'Strawberry fields forever', d: 'Catch <b>100</b> strawberry cookies.', i: 2, t: function () { return data.caught >= 100; } },
    { n: 'Jam session', d: 'Catch <b>500</b> strawberry cookies.', i: 3, t: function () { return data.caught >= 500; } },
    { n: 'Hello, Claude', d: 'Own <b>1</b> Claude.', i: 4, t: function () { return claudeAmt() >= 1; } },
    { n: 'Context is everything', d: 'Own <b>10</b> Claudes.', i: 5, t: function () { return claudeAmt() >= 10; } },
    { n: 'Helpful, harmless and delicious', d: 'Own <b>50</b> Claudes.', i: 6, t: function () { return claudeAmt() >= 50; } },
    { n: 'Claude collective', d: 'Own <b>100</b> Claudes.', i: 7, t: function () { return claudeAmt() >= 100; } },
    { n: 'Thinking pink', d: 'Click the strawberry cookie <b>1,000</b> times.', i: 8, t: function () { return data.pinkClicks >= 1000; } },
    { n: 'Berry rush', d: 'Get a <b>frenzy</b> from a strawberry cookie.', i: 9, t: function () { return !!data.gotFrenzy; } },
    { n: 'Automated orchard', d: 'Let Auto Buy buy <b>100</b> things for you.', i: 10, t: function () { return data.autoBought >= 100; } },
    { n: 'Berry rich', d: 'Have <b>1 billion</b> cookies in the bank with the strawberry look on.', i: 11, t: function () { return Game.cookies >= 1e9 && document.body.classList.contains('ssStrawberry'); } },
    // Hidden ones (shadow achievements: they only show up once you've found them)
    { n: 'Strawberry whisperer', d: 'Tap the strawberries in the title bar <b>10 times</b> in a row.<q>They whispered back.</q>', i: 12, h: 1 },
    { n: 'Secret recipe', d: 'Type the secret word on your keyboard.<q>s-t-r-a-w-b-e-r-r-y.</q>', i: 13, h: 1 },
    { n: 'Berry missed', d: 'Let <b>25</b> strawberry cookies fly away.<q>They had places to be.</q>', i: 14, h: 1, t: function () { return data.missed >= 25; } },
    { n: 'Midnight snack', d: 'Catch a strawberry cookie between <b>midnight and 1am</b>.', i: 15, h: 1 },
    { n: 'With great power', d: 'Use the admin menu.<q>...comes great cookies.</q>', i: 16, h: 1 },
    { n: 'Sweet tooth', d: 'Name your bakery after a <b>strawberry</b>.', i: 17, h: 1, t: function () { return /strawberr/i.test(Game.bakeryName || ''); } },
    { n: 'Seeing pink', d: 'Turn the strawberry look off and back on.<q>Everything looks better pink.</q>', i: 18, h: 1 },
    { n: 'Golden berry', d: 'Catch a strawberry cookie while a <b>golden cookie</b> is on screen.', i: 19, h: 1 }
  ];

  function claudeAmt() { var o = Game.Objects[NAME]; return o ? o.amount : 0; }

  function createAchievements() {
    ACH.forEach(function (a, i) {
      if (Game.Achievements[a.n]) return;
      var ach = new Game.Achievement(a.n, a.d, icon(a.i));
      ach.order = 99000 + i;
      if (a.h) ach.pool = 'shadow';
    });
    (data.ach || []).forEach(function (n) {
      var a = Game.Achievements[n];
      if (a && !a.won) { a.won = 1; if (Game.CountsAsAchievementOwned(a.pool)) Game.AchievementsOwned++; }
    });
  }

  function win(name) {
    var a = Game.Achievements[name];
    if (!a || a.won) return;
    Game.Win(name);
    if (data.ach.indexOf(name) < 0) { data.ach.push(name); persist(); }
  }
  function checkAch() {
    if (!ready) return;
    ACH.forEach(function (a) { if (a.t && !Game.Achievements[a.n].won) { try { if (a.t()) win(a.n); } catch (e) {} } });
  }

  // ================= Hidden strawberry tricks =================
  function berryRain(n) {
    for (var i = 0; i < n; i++) setTimeout(function () { if (window.SSStraw) SSStraw.spawn(); }, i * 450);
  }
  // 1) Tap the title-bar strawberries 10 times quickly -> berry rain
  var taps = [];
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.ssBerry')) return;
    var now = Date.now(); taps = taps.filter(function (t) { return now - t < 5000; }); taps.push(now);
    e.target.closest('.ssBerry').animate && e.target.closest('.ssBerry').animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], 250);
    if (taps.length >= 10) { taps = []; win('Strawberry whisperer'); berryRain(6); U.toast('🍓 Berry rain!'); }
  });
  // 2) Type "strawberry" -> secret recipe
  var typed = '';
  document.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (!e.key || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-10);
    if (typed === 'strawberry') { typed = ''; win('Secret recipe'); berryRain(3); U.toast('📜 Secret recipe found!'); }
  });
  // 3) Strawberry cookie events from extras.js
  window.addEventListener('ss:strawberry', function (e) {
    var d = e.detail || {};
    if (d.caught) {
      data.caught++;
      if (d.frenzy) data.gotFrenzy = 1;
      var h = new Date().getHours();
      if (h === 0) win('Midnight snack');
      if ((Game.shimmers || []).some(function (s) { return s.type === 'golden'; })) win('Golden berry');
    } else data.missed++;
    persist(); checkAch();
  });
  window.addEventListener('ss:autobought', function () { data.autoBought++; if (data.autoBought % 10 === 0) persist(); });
  window.addEventListener('ss:admin', function () { win('With great power'); });
  // 4) Strawberry look turned off and on again
  var lookWasOff = false;
  new MutationObserver(function () {
    var on = document.body.classList.contains('ssStrawberry');
    if (!on) lookWasOff = true;
    else if (lookWasOff) { lookWasOff = false; win('Seeing pink'); }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // ================= Start up =================
  var ready = false, lastClicks = 0;
  var waiter = setInterval(function () {
    if (!U.ready() || !Game.Loader || !Game.Objects.Idleverse) return;
    clearInterval(waiter);
    try {
      var obj = createBuilding();
      createUpgrades();
      createAchievements();
      restoreBuilding(obj);
    } catch (e) { console.error('CookieStawberry content failed to load', e); return; }
    ready = true;
    lastClicks = Game.cookieClicks || 0;
    // Save our slot whenever the game saves, and every few seconds.
    var ws = Game.WriteSave;
    Game.WriteSave = function () { var r = ws.apply(this, arguments); try { saveAll(); } catch (e) {} return r; };
    setInterval(saveAll, 5000);
    window.addEventListener('pagehide', saveAll);
    checkAch();
  }, 400);

  function saveAll() {
    if (!ready) return;
    saveBuilding(); saveUpgrades(); persist();
  }

  // Unlock Claude upgrades, count pink clicks, check achievements.
  setInterval(function () {
    if (!ready) return;
    var a = claudeAmt();
    UPGRADES.forEach(function (u) { if (a >= u.need) Game.Unlock(u.name); });
    var c = Game.cookieClicks || 0;
    if (c > lastClicks && document.body.classList.contains('ssStrawberry')) data.pinkClicks += c - lastClicks;
    lastClicks = c;
    checkAch();
  }, 1000);

  // For the admin menu.
  window.SSContent = {
    claudeName: NAME,
    win: win,
    give: function (name, n) {
      var o = Game.Objects[name]; if (!o || !(n > 0)) return false;
      o.amount += n; o.bought += n; o.highest = Math.max(o.highest, o.amount);
      Game.BuildingsOwned += n;
      if (o.id && $('row' + o.id)) $('row' + o.id).classList.add('enabled');
      o.refresh(); Game.recalculateGains = 1; Game.storeToRefresh = 1;
      if (name === NAME) { saveBuilding(); persist(); }
      checkAch();
      return true;
    },
    storeIcon: STORE_ICON
  };
})();
