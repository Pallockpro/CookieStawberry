// CookieStawberry Auto Buy: buys the buildings/upgrades you pick, and can pop golden cookies.
(function () {
  var U = window.SSUtil;
  var KEY = 'CookieStawberryAutoBuy';
  function $(id) { return document.getElementById(id); }

  var cfg = { on: false, buildings: {}, upg: { regular: true, cookie: true, tech: false },
    golden: false, wrath: false, reindeer: false, strategy: 'value', reserve: 0, notify: true };
  try {
    var saved = JSON.parse(U.get(KEY) || '{}');
    for (var k in saved) {
      if ((k === 'upg' || k === 'buildings') && saved[k] && typeof saved[k] === 'object') {
        for (var j in saved[k]) cfg[k][j] = saved[k][j];
      } else cfg[k] = saved[k];
    }
    if (cfg.notify === undefined) cfg.notify = true;
  } catch (e) {}
  function persist() { U.set(KEY, JSON.stringify(cfg)); }

  var bought = 0, last = '', target = null;
  // Items the game refused to sell us get skipped for a while so one stuck item can't block everything.
  var skipUntil = {};
  function skipKey(c) { return c.kind + ':' + (c.obj.id !== undefined ? c.obj.id : c.name); }
  function skipped(c) { return (skipUntil[skipKey(c)] || 0) > Date.now(); }

  function fmt(n) {
    try { if (typeof Beautify === 'function') return Beautify(n); } catch (e) {}
    return Math.round(n).toLocaleString();
  }
  function bName(o) { return o.dname || o.displayName || o.name; }
  function bPrice(o) { return typeof o.getPrice === 'function' ? o.getPrice() : o.price; }
  function uPrice(u) { return typeof u.getPrice === 'function' ? u.getPrice() : (u.basePrice || u.price || 0); }
  function wanted(o) { return cfg.buildings[o.name] !== false; } // new buildings default to on

  // Which category an upgrade belongs to (null = never auto-buy).
  function upgCat(u) {
    if (!u || u.bought) return null;
    if (Game.vault && Game.vault.indexOf(u.id) >= 0) return null;
    if (u.priceLumps > 0 || u.lumpCost > 0) return null; // costs sugar lumps, not cookies
    if (u.pool === 'cookie') return 'cookie';
    if (u.pool === 'tech') return 'tech';
    if (!u.pool) return u.clickFunction ? null : 'regular'; // anything that pops a prompt is skipped
    return null; // toggles (Elder Pledge, switches...), prestige, debug
  }

  function reserve() {
    var cps = (typeof Game.unbuffedCps === 'number' && Game.unbuffedCps > 0) ? Game.unbuffedCps : (Game.cookiesPs || 0);
    return cps * 60 * (+cfg.reserve || 0);
  }

  function candidates() {
    var list = [];
    (Game.ObjectsById || []).forEach(function (o) {
      if (!o || o.locked || !wanted(o)) return;
      var gain = (o.storedCps || 0) * (Game.globalCpsMult || 1);
      list.push({ kind: 'b', obj: o, name: bName(o), price: bPrice(o), gain: gain });
    });
    (Game.UpgradesInStore || []).forEach(function (u) {
      var c = upgCat(u);
      if (!c || !cfg.upg[c]) return;
      list.push({ kind: 'u', obj: u, name: u.dname || u.name, price: uPrice(u), tech: c === 'tech' });
    });
    return list.filter(function (c) { return isFinite(c.price) && c.price >= 0 && !skipped(c); });
  }

  function pickTarget() {
    var list = candidates();
    if (!list.length) return null;
    var cheapest = function (a, b) { return a.price - b.price; };
    if (cfg.strategy !== 'value') return list.sort(cheapest)[0];
    // Best value: upgrades as soon as they're no pricier than the best building,
    // otherwise the building that pays itself back fastest.
    var ups = list.filter(function (c) { return c.kind === 'u'; }).sort(cheapest);
    var bs = list.filter(function (c) { return c.kind === 'b'; }).sort(function (a, b) {
      var pa = a.gain > 0 ? a.price / a.gain : Infinity, pb = b.gain > 0 ? b.price / b.gain : Infinity;
      return pa === pb ? a.price - b.price : pa - pb;
    });
    if (ups.length && (!bs.length || ups[0].price <= bs[0].price)) return ups[0];
    return bs[0] || ups[0];
  }

  function buy(t) {
    if (t.kind === 'b') {
      var mode = Game.buyMode, before = t.obj.amount;
      Game.buyMode = 1; // make sure we never sell
      try { t.obj.buy(1); } finally { Game.buyMode = mode; }
      return t.obj.amount > before;
    }
    if (typeof t.obj.canBuy === 'function' && !t.obj.canBuy()) return false;
    t.obj.buy(t.tech ? 1 : undefined);
    return !!t.obj.bought;
  }

  function iconOf(c) {
    var id = c.kind === 'b' ? 'productIcon' + c.obj.id : 'upgrade' + (Game.UpgradesInStore || []).indexOf(c.obj);
    var el = document.getElementById(id);
    if (!el) return null;
    var cs = getComputedStyle(el);
    if (!cs.backgroundImage || cs.backgroundImage === 'none') return null;
    return { img: cs.backgroundImage, pos: cs.backgroundPosition, big: c.kind === 'b' };
  }

  // Small "Auto bought ..." notifications, top right. Repeats of the same item are grouped.
  var notes = {};
  function notify(c, icon) {
    if (!cfg.notify) return;
    var box = $('abNotes'), k = skipKey(c), n = notes[k];
    if (n && n.el.parentNode) {
      n.count++;
      n.el.querySelector('.abNoteCount').textContent = '\u00D7' + n.count;
      clearTimeout(n.timer);
    } else {
      var el = document.createElement('div');
      el.className = 'abNote';
      el.innerHTML = '<span class="abNoteIcon"><span class="abNoteSprite"></span></span>' +
        '<span class="abNoteText"><small>Auto bought</small><b></b></span><span class="abNoteCount"></span>';
      el.querySelector('b').textContent = c.name;
      var sp = el.querySelector('.abNoteSprite');
      if (icon) {
        sp.style.backgroundImage = icon.img; sp.style.backgroundPosition = icon.pos;
        sp.classList.add(icon.big ? 'big' : 'small');
      } else sp.textContent = c.kind === 'b' ? '\uD83C\uDFED' : '\u2B06';
      box.insertBefore(el, box.firstChild);
      while (box.children.length > 4) box.removeChild(box.lastChild);
      n = notes[k] = { el: el, count: 1 };
    }
    n.timer = setTimeout(function () {
      n.el.classList.add('out');
      setTimeout(function () { if (n.el.parentNode) n.el.parentNode.removeChild(n.el); if (notes[k] === n) delete notes[k]; }, 300);
    }, 2500);
  }

  function popShimmers() {
    if (!Game.shimmers || !(cfg.golden || cfg.reindeer)) return;
    Game.shimmers.slice().forEach(function (s) {
      try {
        if (s.type === 'golden' && cfg.golden && (!s.wrath || cfg.wrath)) s.pop();
        else if (s.type === 'reindeer' && cfg.reindeer) s.pop();
      } catch (e) {}
    });
  }

  function tick() {
    if (!U.ready() || !cfg.on) return;
    if (Game.OnAscend || Game.AscendTimer > 0) { target = null; return; }
    popShimmers();
    for (var i = 0; i < 10; i++) {
      target = pickTarget();
      if (!target || Game.cookies - reserve() < target.price) break;
      var ok = false, icon = iconOf(target);
      try { ok = buy(target); } catch (e) {}
      if (!ok) { skipUntil[skipKey(target)] = Date.now() + 30000; continue; }
      bought++; last = target.name;
      notify(target, icon);
    }
  }
  setInterval(tick, 250);

  // ---------- UI ----------
  var tiles = {};
  function copyIcon(srcId, el) {
    var src = $(srcId);
    if (!src) return false;
    var cs = getComputedStyle(src);
    if (!cs.backgroundImage || cs.backgroundImage === 'none') return false;
    el.style.backgroundImage = cs.backgroundImage;
    el.style.backgroundPosition = cs.backgroundPosition;
    el.textContent = '';
    return true;
  }

  function buildGrid() {
    var objs = Game.ObjectsById || [];
    if (!objs.length) return false;
    var grid = $('abGrid'); grid.innerHTML = '';
    objs.forEach(function (o) {
      var t = document.createElement('button');
      t.className = 'abTile';
      t.innerHTML = '<span class="abIcon"><span class="abSprite"></span><span class="abLock">&#128274;</span></span>' +
        '<span class="abName"></span><span class="abOwned"></span><span class="abCheck">&#10003;</span>';
      t.onclick = function () {
        cfg.buildings[o.name] = !wanted(o); persist(); refreshTile(o);
      };
      grid.appendChild(t);
      tiles[o.name] = t;
    });
    return true;
  }

  function refreshTile(o) {
    var t = tiles[o.name]; if (!t) return;
    var sprite = t.querySelector('.abSprite');
    if (!copyIcon('productIcon' + o.id, sprite) && !sprite.textContent) sprite.textContent = bName(o).charAt(0);
    t.classList.toggle('on', wanted(o));
    t.classList.toggle('locked', !!o.locked);
    t.classList.toggle('afford', !o.locked && Game.cookies >= bPrice(o));
    t.querySelector('.abName').textContent = o.locked ? '???' : bName(o);
    t.querySelector('.abOwned').textContent = o.locked ? 'Locked' : (o.amount || 0) + ' owned';
    t.title = o.locked ? 'Locked - keep baking to unlock' : bName(o) + ' - ' + fmt(bPrice(o)) + ' cookies';
  }

  function refreshUpgrades() {
    var box = $('abUpList');
    var ups = (Game.UpgradesInStore || []).map(function (u, i) { return { u: u, i: i, c: upgCat(u) }; })
      .filter(function (x) { return x.c; }).slice(0, 8);
    if (!ups.length) { box.innerHTML = '<div class="abEmpty">No upgrades available yet</div>'; return; }
    box.innerHTML = '';
    ups.forEach(function (x) {
      var row = document.createElement('div');
      row.className = 'abUp' + (cfg.upg[x.c] ? '' : ' off') + (Game.cookies >= uPrice(x.u) ? ' afford' : '');
      row.innerHTML = '<span class="abUpIcon"><span class="abUpSprite"></span></span><span class="abUpName"></span><span class="abUpPrice"></span>';
      var ic = row.querySelector('.abUpSprite');
      if (!copyIcon('upgrade' + x.i, ic)) ic.textContent = '⬆';
      row.querySelector('.abUpName').textContent = x.u.dname || x.u.name;
      row.querySelector('.abUpPrice').textContent = fmt(uPrice(x.u));
      box.appendChild(row);
    });
  }

  function refreshStatus() {
    var btn = $('ssAutoBtn');
    btn.classList.toggle('abActive', !!cfg.on);
    $('abStatus').textContent = !cfg.on ? 'Off' : !U.ready() ? 'Waiting for game...' :
      (Game.OnAscend || Game.AscendTimer > 0) ? 'Paused while ascending' : 'Running';
    $('ssAutoBody').classList.toggle('abIsOn', !!cfg.on);
    var t = cfg.on && U.ready() ? (target || pickTarget()) : null;
    if (t) {
      var have = Math.max(0, Game.cookies - reserve());
      var pct = Math.min(100, t.price > 0 ? have / t.price * 100 : 100);
      $('abTargetName').textContent = 'Next: ' + t.name + ' (' + fmt(t.price) + ')';
      $('abTargetPct').textContent = Math.floor(pct) + '%';
      $('abBarFill').style.width = pct + '%';
    } else {
      $('abTargetName').textContent = cfg.on ? 'Nothing selected to buy' : 'Turn on to start buying';
      $('abTargetPct').textContent = '';
      $('abBarFill').style.width = '0%';
    }
    $('abLast').textContent = last ? 'Last: ' + last : ' ';
    $('abCount').textContent = bought + ' bought';
  }

  var gridBuilt = false;
  function refreshUI() {
    refreshStatus();
    if (!$('ssAutoBody').classList.contains('open') || !U.ready()) return;
    if (!gridBuilt) gridBuilt = buildGrid();
    (Game.ObjectsById || []).forEach(refreshTile);
    if (!$('abPaneU').hidden) refreshUpgrades();
  }
  setInterval(refreshUI, 500);

  // Controls
  $('abOn').checked = !!cfg.on;
  $('abOn').onchange = function () {
    cfg.on = this.checked; persist(); refreshUI();
    U.toast('Auto buy ' + (cfg.on ? 'on' : 'off'));
  };
  Array.prototype.forEach.call(document.querySelectorAll('.abTab'), function (tab) {
    tab.onclick = function () {
      Array.prototype.forEach.call(document.querySelectorAll('.abTab'), function (t) {
        t.classList.toggle('on', t === tab);
        $(t.getAttribute('data-pane')).hidden = t !== tab;
      });
      refreshUI();
    };
  });
  $('abAll').onclick = function () { (Game.ObjectsById || []).forEach(function (o) { cfg.buildings[o.name] = true; }); persist(); refreshUI(); };
  $('abNone').onclick = function () { (Game.ObjectsById || []).forEach(function (o) { cfg.buildings[o.name] = false; }); persist(); refreshUI(); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-upg]'), function (cb) {
    var c = cb.getAttribute('data-upg');
    cb.checked = !!cfg.upg[c];
    cb.onchange = function () { cfg.upg[c] = this.checked; persist(); refreshUI(); };
  });
  [['abGolden', 'golden'], ['abWrath', 'wrath'], ['abReindeer', 'reindeer']].forEach(function (p) {
    $(p[0]).checked = !!cfg[p[1]];
    $(p[0]).onchange = function () { cfg[p[1]] = this.checked; persist(); };
  });
  $('abNotify').checked = !!cfg.notify;
  $('abNotify').onchange = function () { cfg.notify = this.checked; persist(); };
  $('abStrategy').value = cfg.strategy;
  $('abStrategy').onchange = function () { cfg.strategy = this.value; persist(); refreshUI(); };
  $('abReserve').value = String(cfg.reserve);
  $('abReserve').onchange = function () { cfg.reserve = +this.value; persist(); refreshUI(); };
})();
