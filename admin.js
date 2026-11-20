// CookieStawberry admin menu (password protected): spawn cookies, give cookies, buffs...
// Note: this is a lock for a single-player game, not real security - anyone can read page code.
(function () {
  var U = window.SSUtil;
  // SHA-256 of the password, lower-cased and trimmed ("Strawberry Cookie").
  var HASH = '4701a053faccedaf490cb933034f656b76efb9cb5353e39073973cb0a5b81338';
  var SESSION_KEY = 'CookieStawberryAdmin';
  function $(id) { return document.getElementById(id); }

  function sessionGet() { try { return sessionStorage.getItem(SESSION_KEY); } catch (e) { return null; } }
  function sessionSet(v) { try { if (v) sessionStorage.setItem(SESSION_KEY, v); else sessionStorage.removeItem(SESSION_KEY); } catch (e) {} }

  function sha256(text) {
    if (!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.reject(new Error('unsupported'));
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  function setUnlocked(on) {
    $('adLogin').hidden = on;
    $('adTools').hidden = !on;
    $('adLock').hidden = !on;
    $('adStatus').textContent = on ? 'Unlocked' : 'Locked';
    $('ssAdminBody').classList.toggle('adOpen', on);
  }

  var tries = 0, lockedUntil = 0;
  $('adLogin').onsubmit = function (e) {
    e.preventDefault();
    var err = $('adErr');
    if (Date.now() < lockedUntil) { err.textContent = 'Too many tries - wait a few seconds'; return; }
    var guess = $('adPass').value.trim().toLowerCase().replace(/\s+/g, ' ');
    sha256(guess).then(function (h) {
      if (h === HASH) {
        tries = 0; err.textContent = ''; $('adPass').value = '';
        sessionSet('1'); setUnlocked(true); U.toast('🔓 Admin unlocked');
      } else {
        tries++; if (tries >= 5) { lockedUntil = Date.now() + 10000; tries = 0; }
        err.textContent = 'Wrong password';
        $('adPass').select();
      }
    }, function () { err.textContent = 'Your browser can\'t check the password here (needs https)'; });
  };
  $('adLock').onclick = function () { sessionSet(null); setUnlocked(false); U.toast('🔒 Admin locked'); };

  // ---------- Tools ----------
  function fmt(n) { try { return Beautify(n); } catch (e) { return Math.round(n).toLocaleString(); } }
  var SUFFIX = { k: 1e3, m: 1e6, b: 1e9, t: 1e12, qa: 1e15, qi: 1e18 };
  function parseAmount(text) {
    var m = String(text || '').trim().toLowerCase().replace(/,/g, '').match(/^(\d*\.?\d+)(e\d+)?\s*(k|m|b|t|qa|qi)?$/);
    if (!m) return NaN;
    return parseFloat(m[1] + (m[2] || '')) * (m[3] ? SUFFIX[m[3]] : 1);
  }
  function cps() { return Math.max(Game.cookiesPs || 0, 1); }
  function give(n, label) {
    if (!(n > 0) || !isFinite(n)) return U.toast('Enter an amount like 5000, 2.5m or 1b');
    Game.Earn(n);
    U.toast('+' + fmt(n) + ' cookies' + (label ? ' (' + label + ')' : ''));
  }

  var actions = {
    straw: function () { if (window.SSStraw) SSStraw.spawn(); U.toast('🍓 Strawberry cookie spawned'); },
    golden: function () { new Game.shimmer('golden', { noWrath: 1 }); U.toast('🌟 Golden cookie spawned'); },
    wrath: function () { new Game.shimmer('golden', { wrath: 1 }); U.toast('😈 Wrath cookie spawned'); },
    reindeer: function () { new Game.shimmer('reindeer'); U.toast('🦌 Reindeer spawned'); },
    give: function () { give(parseAmount($('adAmount').value)); },
    hour: function () { give(cps() * 3600, '1 hour'); },
    day: function () { give(cps() * 86400, '1 day'); },
    double: function () { give(Math.max(Game.cookies, 1), 'x2 bank'); },
    lumps: function () { Game.gainLumps(10); U.toast('+10 sugar lumps'); },
    frenzy: function () { Game.gainBuff('frenzy', 77, 7); U.toast('Frenzy! x7 production'); },
    click: function () { Game.gainBuff('click frenzy', 13, 777); U.toast('Click frenzy! x777 clicks'); },
    dragon: function () { Game.gainBuff('dragonflight', 10, 1111); U.toast('Dragonflight! x1111 clicks'); },
    elder: function () { Game.gainBuff('blood frenzy', 6, 666); U.toast('Elder frenzy! x666 production'); },
    clearbuffs: function () { Game.killBuffs(); U.toast('Buffs cleared'); },
    wrinklers: function () {
      var n = (Game.wrinklers || []).filter(function (w) { return w.phase > 0; }).length;
      Game.CollectWrinklers(); U.toast(n ? 'Popped ' + n + ' wrinkler' + (n > 1 ? 's' : '') : 'No wrinklers to pop');
    },
    chips: function () { Game.heavenlyChips += 100; U.toast('+100 heavenly chips'); },
    building: function () {
      var name = $('adBuilding').value, n = Math.floor(parseAmount($('adBuildingAmt').value || '1'));
      if (!(n > 0) || n > 100000) return U.toast('Enter how many (1 to 100,000)');
      if (window.SSContent && SSContent.give(name, n)) U.toast('+' + n + ' ' + name + (n > 1 ? 's' : ''));
      else U.toast('Could not give ' + name);
    },
    goldtimer: function () {
      var g = Game.shimmerTypes.golden;
      g.time = Math.max(g.time, g.maxTime - Game.fps * 3);
      U.toast('A golden cookie will appear within a few seconds');
    }
  };

  Array.prototype.forEach.call(document.querySelectorAll('[data-ad]'), function (btn) {
    btn.onclick = function () {
      if (sessionGet() !== '1') return setUnlocked(false);
      if (!U.ready()) return U.toast('Game not loaded yet');
      try { actions[btn.getAttribute('data-ad')](); window.dispatchEvent(new Event('ss:admin')); } catch (e) { U.toast('That didn\'t work: ' + e.message); }
    };
  });
  $('adAmount').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); actions.give(); } });

  // Fill the building list once the game (and the Claude building) is ready.
  var fill = setInterval(function () {
    if (!U.ready() || !Game.ObjectsById || !(window.SSContent && Game.Objects[SSContent.claudeName])) return;
    clearInterval(fill);
    var sel = $('adBuilding');
    sel.innerHTML = Game.ObjectsById.map(function (o) { return '<option value="' + o.name + '">' + (o.dname || o.name) + '</option>'; }).join('');
    sel.value = SSContent.claudeName;
  }, 700);
  setUnlocked(sessionGet() === '1');
})();
