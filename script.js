(function () {
  'use strict';

  var BASE = {
    accra: [
      { id: 'acc-01', stops: ['Circle', 'Odawna', 'Abossey Okai', 'Kaneshie'], fare: 5 },
      { id: 'acc-02', stops: ['Circle', 'Achimota'], fare: 6 },
      { id: 'acc-03', stops: ['Circle', 'Tetteh Quarshie', 'Legon', 'Madina'], fare: 9 },
      { id: 'acc-04', stops: ['Tema Station', 'Circle'], fare: 4 },
      { id: 'acc-05', stops: ['Tema Station', 'Kaneshie'], fare: 4 },
      { id: 'acc-06', stops: ['Tema Station', '37 Station', 'Legon', 'Madina'], fare: 9 },
      { id: 'acc-07', stops: ['Tema Station', 'Labadi', 'Teshie', 'Nungua', 'Tema Community 1'], fare: 12 },
      { id: 'acc-08', stops: ['Kaneshie', 'Odorkor', 'Mallam Junction', 'Kasoa'], fare: 9 },
      { id: 'acc-09', stops: ['Kaneshie', 'Lapaz'], fare: 4 },
      { id: 'acc-10', stops: ['Lapaz', 'Achimota'], fare: 4 },
      { id: 'acc-11', stops: ['Circle', 'Osu'], fare: 4 },
      { id: 'acc-12', stops: ['Osu', 'Labadi'], fare: 4 },
      { id: 'acc-13', stops: ['Madina', 'Adenta'], fare: 4 },
      { id: 'acc-14', stops: ['Achimota', 'Dome', 'Kwabenya'], fare: 6 },
      { id: 'acc-15', stops: ['Circle', '37 Station', 'Airport'], fare: 6 },
      { id: 'acc-16', stops: ['Spintex Road', 'Tetteh Quarshie'], fare: 5 },
      { id: 'acc-17', stops: ['Tema Community 1', 'Ashaiman'], fare: 4 }
    ],
    kumasi: [
      { id: 'kum-01', stops: ['Kejetia', 'Adum'], fare: 3 },
      { id: 'kum-02', stops: ['Kejetia', 'Adum', 'Ahodwo', 'Santasi'], fare: 5 },
      { id: 'kum-03', stops: ['Adum', 'Amakom', 'KNUST', 'Ayeduase'], fare: 5 },
      { id: 'kum-04', stops: ['Kejetia', 'Bantama', 'Abuakwa'], fare: 5 },
      { id: 'kum-05', stops: ['Kejetia', 'Suame'], fare: 4 },
      { id: 'kum-06', stops: ['Adum', 'Asokwa', 'Atonsu'], fare: 5 }
    ]
  };
  var DEFAULTS = { accra: ['Circle', 'Kasoa'], kumasi: ['Kejetia', 'KNUST'] };
  var CITY_NAMES = { accra: 'Accra', kumasi: 'Kumasi' };

  // <pure>
  function plan(lines, from, to, penalty) {
    var at = {};
    lines.forEach(function (l, li) {
      l.stops.forEach(function (s, idx) { (at[s] = at[s] || []).push({ li: li, idx: idx }); });
    });
    var dist = {}, prev = {}, done = {}, pq = [];
    function key(li, idx) { return li + '@' + idx; }
    (at[from] || []).forEach(function (o) {
      var k = key(o.li, o.idx); dist[k] = 0; pq.push({ k: k, li: o.li, idx: o.idx, d: 0 });
    });
    var end = null;
    while (pq.length) {
      pq.sort(function (a, b) { return a.d - b.d; });
      var cur = pq.shift();
      if (done[cur.k]) continue;
      done[cur.k] = true;
      var st = lines[cur.li].stops;
      if (st[cur.idx] === to) { end = cur; break; }
      var nbrs = [];
      if (cur.idx > 0) nbrs.push([cur.li, cur.idx - 1, 1]);
      if (cur.idx < st.length - 1) nbrs.push([cur.li, cur.idx + 1, 1]);
      (at[st[cur.idx]] || []).forEach(function (o) {
        if (o.li !== cur.li) nbrs.push([o.li, o.idx, penalty]);
      });
      nbrs.forEach(function (n) {
        var k = key(n[0], n[1]), nd = cur.d + n[2];
        if (!done[k] && (dist[k] === undefined || nd < dist[k])) {
          dist[k] = nd; prev[k] = cur.k; pq.push({ k: k, li: n[0], idx: n[1], d: nd });
        }
      });
    }
    if (!end) return null;
    var path = [], k = end.k;
    while (k !== undefined) {
      var p = k.split('@');
      path.unshift({ li: +p[0], idx: +p[1] });
      k = prev[k];
    }
    var legs = [];
    path.forEach(function (p) {
      var last = legs[legs.length - 1];
      if (last && last.li === p.li) last.to = p.idx;
      else legs.push({ li: p.li, from: p.idx, to: p.idx });
    });
    return legs.filter(function (l) { return l.from !== l.to; });
  }
  function ceilHalf(x) { return Math.ceil(x * 2) / 2; }
  function legFare(line, hops) {
    var n = line.stops.length - 1;
    return Math.max(2, ceilHalf(line.fare * hops / n));
  }
  function median(a) {
    var s = a.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
  function legKey(rid, a, b) {
    var p = [slug(a), slug(b)].sort();
    return slug(rid) + '~' + p[0] + '~' + p[1];
  }
  function computeStats(docs) {
    var votes = Object.create(null), fares = Object.create(null);
    docs.forEach(function (d) {
      var data = d.data || {};
      var v = data.votes;
      if (v && typeof v === 'object') Object.keys(v).forEach(function (rid) {
        var e = v[rid];
        if (!e || (e.v !== 1 && e.v !== -1)) return;
        var s = votes[rid] || (votes[rid] = { conf: 0, wrong: 0, last: 0 });
        if (e.v === 1) { s.conf++; if (typeof e.t === 'number' && e.t > s.last) s.last = e.t; }
        else s.wrong++;
      });
      var f = data.fares;
      if (f && typeof f === 'object') Object.keys(f).forEach(function (k) {
        var e = f[k];
        if (!e || typeof e.a !== 'number' || !(e.a > 0) || e.a > 500) return;
        (fares[k] = fares[k] || []).push(e.a);
      });
    });
    return { votes: votes, fares: fares };
  }
  // </pure>

  /* ---------- state ---------- */
  var city = 'accra';
  try { var sc = localStorage.getItem('trotro-city'); if (sc && CITY_NAMES[sc]) city = sc; } catch (e) {}
  var dbState = 'loading';      // loading | on | off
  var db = null, myId = null, canWrite = false;
  var contribDocs = [], reportDocs = [];
  var stats = { votes: Object.create(null), fares: Object.create(null) };
  var items = [], active = [], lines = [];
  var replaces = null, current = 0, flashes = {};

  var fromEl = document.getElementById('from');
  var toEl = document.getElementById('to');
  var resultEl = document.getElementById('result');
  var listEl = document.getElementById('lineList');
  var statusEl = document.getElementById('status');

  /* ---------- helpers ---------- */
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) { return 'GH₵ ' + (n % 1 === 0 ? n : n.toFixed(2)); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function ago(t) {
    var m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 2) return 'just now';
    if (m < 60) return m + ' minutes ago';
    var h = Math.round(m / 60);
    if (h < 24) return plural(h, 'hour') + ' ago';
    return plural(Math.round(h / 24), 'day') + ' ago';
  }
  var statusTimer = null;
  function say(text, ok) {
    statusEl.textContent = text; statusEl.className = 'status' + (ok ? ' ok' : '');
    clearTimeout(statusTimer);
    if (text) statusTimer = setTimeout(function () { statusEl.textContent = ''; }, 5000);
  }
  function errText(e) {
    var c = e && e.code;
    if (c === 'quota_exceeded') return 'The shared database is full, so this could not be saved.';
    if (c === 'invalid_argument') return 'You do not have permission to add data here.';
    if (e && e.message === 'limit') return 'You have reached the limit of routes you can add.';
    return 'Could not save. Check your connection and try again.';
  }

  /* ---------- route data ---------- */
  function cleanRoute(id, raw, by) {
    if (!/^[A-Za-z0-9_-]{1,60}$/.test(id) || !raw || typeof raw !== 'object') return null;
    if (!Array.isArray(raw.stops) || raw.stops.length < 2 || raw.stops.length > 25) return null;
    var stops = [], seen = {};
    for (var i = 0; i < raw.stops.length; i++) {
      var s = raw.stops[i];
      if (typeof s !== 'string') return null;
      s = s.trim();
      if (!s || s.length > 40 || seen[s.toLowerCase()]) return null;
      seen[s.toLowerCase()] = true; stops.push(s);
    }
    if (typeof raw.fare !== 'number' || !(raw.fare > 0) || raw.fare > 500) return null;
    if (typeof raw.city !== 'string' || !Object.prototype.hasOwnProperty.call(CITY_NAMES, raw.city)) return null;
    var rep = (typeof raw.replaces === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(raw.replaces)) ? raw.replaces : null;
    return { id: id, stops: stops, fare: raw.fare, city: raw.city, origin: 'community', by: by, t: typeof raw.t === 'number' ? raw.t : 0, replaces: rep };
  }

  function buildItems() {
    stats = computeStats(reportDocs);
    var list = [];
    (BASE[city] || []).forEach(function (r) {
      list.push({ r: { id: r.id, stops: r.stops, fare: r.fare, city: city, origin: 'base', by: null, replaces: null } });
    });
    contribDocs.forEach(function (d) {
      var rs = d.data && d.data.routes;
      if (!rs || typeof rs !== 'object') return;
      Object.keys(rs).forEach(function (id) {
        var r = cleanRoute(id, rs[id], d.id);
        if (r && r.city === city) list.push({ r: r });
      });
    });
    var byId = new Map();
    list.forEach(function (it) {
      var s = stats.votes[it.r.id] || { conf: 0, wrong: 0, last: 0 };
      it.conf = s.conf; it.wrong = s.wrong; it.last = s.last; it.score = s.conf - s.wrong; it.hidden = null;
      byId.set(it.r.id, it);
    });
    list.forEach(function (it) {
      if (it.score <= -3) it.hidden = 'disputed';
      var orig = it.r.replaces && byId.get(it.r.replaces);
      if (orig && orig !== it && it.score >= 2 && it.score >= orig.score) orig.replacedBy = it;
    });
    list.forEach(function (it) { if (it.replacedBy && !it.hidden) it.hidden = 'replaced'; });
    items = list;
    active = list.filter(function (it) { return !it.hidden; });
    lines = active.map(function (it) { return it.r; });
  }

  function myDoc(list) {
    for (var i = 0; i < list.length; i++) if (list[i].id === myId) return list[i].data || {};
    return {};
  }
  function myVote(rid) {
    var v = myDoc(reportDocs).votes;
    var e = v && typeof v === 'object' ? v[rid] : null;
    return e && typeof e.v === 'number' ? e.v : 0;
  }

  function legFareInfo(line, l) {
    var hops = Math.abs(l.to - l.from);
    var list = stats.fares[legKey(line.id, line.stops[l.from], line.stops[l.to])];
    if (list && list.length) return { amt: median(list), n: list.length, real: true };
    return { amt: legFare(line, hops), n: 0, real: false };
  }
  function hopsOf(legs) { return legs.reduce(function (a, l) { return a + Math.abs(l.to - l.from); }, 0); }
  function sig(legs) { return legs.map(function (l) { return l.li + ':' + l.from + '-' + l.to; }).join('|'); }

  /* ---------- writing to the shared database ---------- */
  var queue = Promise.resolve();
  function writeMine(col, mutate) {
    var p = queue.then(function () {
      var ref = db.doc(col + '/' + myId);
      return ref.get().then(function (s) {
        var cur = s.exists ? clone(s.data()) : {};
        return ref.set(mutate(cur));
      });
    }).then(function () { return true; }, function (e) {
      if (e && e.code === 'invalid_argument') { canWrite = false; renderAll(); }
      say(errText(e));
      return false;
    });
    queue = p;
    return p;
  }
  function trim(obj, max) {
    var keys = Object.keys(obj);
    if (keys.length <= max) return;
    keys.sort(function (a, b) { return (obj[a].t || 0) - (obj[b].t || 0); });
    for (var i = 0; i < keys.length - max; i++) delete obj[keys[i]];
  }
  function castVote(rid, v) {
    return writeMine('reports', function (d) {
      d.votes = d.votes || {};
      if (d.votes[rid] && d.votes[rid].v === v) delete d.votes[rid];
      else d.votes[rid] = { v: v, t: Date.now() };
      trim(d.votes, 300);
      return d;
    });
  }
  function reportFare(key, amt) {
    return writeMine('reports', function (d) {
      d.fares = d.fares || {};
      d.fares[key] = { a: amt, t: Date.now() };
      trim(d.fares, 300);
      return d;
    });
  }

  /* ---------- rendering ---------- */
  var knownStopsKey = '';
  function stopsNow() {
    var set = {};
    lines.forEach(function (l) { l.stops.forEach(function (s) { set[s] = true; }); });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
  }
  function fillSelects(forceDefaults) {
    var stops = stopsNow(), k = stops.join('|');
    var f = fromEl.value, t = toEl.value;
    if (forceDefaults) { f = DEFAULTS[city][0]; t = DEFAULTS[city][1]; }
    if (k !== knownStopsKey || forceDefaults) {
      var opts = stops.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('');
      fromEl.innerHTML = opts; toEl.innerHTML = opts;
      knownStopsKey = k;
      fromEl.value = stops.indexOf(f) >= 0 ? f : stops[0];
      toEl.value = stops.indexOf(t) >= 0 ? t : stops[stops.length > 1 ? 1 : 0];
    }
  }

  function renderCities() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-city]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-city') === city));
    });
  }
  function renderNote() {
    var el = document.getElementById('commNote'), t;
    var people = {};
    reportDocs.forEach(function (d) { people[d.id] = true; });
    contribDocs.forEach(function (d) { people[d.id] = true; });
    var n = Object.keys(people).length;
    if (dbState === 'off') t = 'Community reports are not available in this view, so you are seeing the starter routes only.';
    else if (dbState === 'loading') t = 'Loading community reports…';
    else if (canWrite) t = 'Shared with everyone who has this link. Confirm routes, report what you paid, or add a route. ' + (n ? plural(n, 'rider') + ' so far.' : 'Be the first to contribute.');
    else t = 'You can see what riders report. Ask the owner to make you a Contributor so you can add your own reports.';
    el.textContent = t;
    document.getElementById('addWrap').hidden = !canWrite;
  }

  function trustHtml(it) {
    var parts = [];
    if (it.conf > 0) parts.push('<b>Confirmed by ' + plural(it.conf, 'rider') + '</b>' + (it.last ? ' · last ' + ago(it.last) : ''));
    else parts.push(it.r.origin === 'base' ? 'Starter route, nobody has confirmed it yet' : 'New route, nobody else has confirmed it yet');
    if (it.wrong > 0) parts.push(plural(it.wrong, 'rider') + ' reported it wrong');
    return parts.join(' · ');
  }

  function legHtml(l, i, total) {
    var line = lines[l.li], it = active[l.li], st = line.stops;
    var dir = l.to > l.from ? 1 : -1;
    var hops = Math.abs(l.to - l.from);
    var board = st[l.from], alight = st[l.to];
    var sign = dir > 0 ? st[st.length - 1] : st[0];
    var next = st[l.from + dir];
    var mids = [];
    for (var j = l.from + dir; j !== l.to; j += dir) mids.push(st[j]);
    var fi = legFareInfo(line, l);
    var key = legKey(line.id, board, alight);

    var others = {};
    lines.forEach(function (o, oi) {
      if (oi === l.li) return;
      o.stops.forEach(function (s, idx) {
        if (s !== board) return;
        if (idx > 0) others[o.stops[0]] = true;
        if (idx < o.stops.length - 1) others[o.stops[o.stops.length - 1]] = true;
      });
    });
    delete others[sign];
    var otherList = Object.keys(others).slice(0, 6);

    var h = '<article class="leg">';
    h += '<div class="leghead"><span class="legno">' + (total > 1 ? 'Ride ' + (i + 1) + ' of ' + total : 'Your ride') + '</span>';
    h += '<span class="meta">' + plural(hops, 'stop') + ' · ' + (fi.real ? money(fi.amt) + ' reported by ' + plural(fi.n, 'rider') : 'about ' + money(fi.amt) + ' (estimate)') + '</span></div>';
    h += '<div class="look"><small>Look for this name on the windscreen. The mate will usually shout it.</small><div class="board">' + esc(sign) + '</div></div>';
    h += '<ol class="rail">';
    h += '<li class="node on"><strong>Board at ' + esc(board) + '</strong><span class="sub">Go to the ' + esc(board) + ' station.</span></li>';
    mids.forEach(function (m) { h += '<li class="node mid">' + esc(m) + '</li>'; });
    h += '<li class="node off"><strong>Get off at ' + esc(alight) + '</strong><span class="sub">Tell the mate "' + esc(alight) + '" when you board.</span></li>';
    h += '</ol>';
    if (otherList.length) {
      h += '<div class="others"><span>Also loading at ' + esc(board) + ', not yours:</span>' +
        otherList.map(function (s) { return '<span class="chip">' + esc(s) + '</span>'; }).join('') + '</div>';
    }
    h += '<p class="check"><b>Wrong one?</b> The first stop after you board should be ' + esc(next) + '. If the mate says otherwise, ask before you pay.</p>';
    h += '<p class="trust">' + trustHtml(it) + '</p>';
    if (canWrite) {
      var mv = myVote(line.id);
      h += '<div class="community"><div class="rate"><span>Did this route work?</span>' +
        '<button type="button" class="rbtn" data-vote="1" data-rid="' + esc(line.id) + '" aria-pressed="' + (mv === 1) + '">Yes, correct</button>' +
        '<button type="button" class="rbtn" data-vote="-1" data-rid="' + esc(line.id) + '" aria-pressed="' + (mv === -1) + '">No, wrong</button></div>' +
        '<div class="farebox"><label for="fare-' + i + '">What did you pay for this ride?</label>' +
        '<input id="fare-' + i + '" type="number" inputmode="decimal" min="0.5" step="0.5" placeholder="GH₵">' +
        '<button type="button" class="rbtn" data-report="' + i + '" data-rid="' + esc(line.id) + '" data-from="' + esc(board) + '" data-to="' + esc(alight) + '">Report fare</button></div>' +
        '<p class="flash">' + esc(flashes[key] || '') + '</p></div>';
    }
    h += '</article>';
    return h;
  }

  function renderResult() {
    var from = fromEl.value, to = toEl.value;
    if (!from || !to) { resultEl.innerHTML = ''; return; }
    if (from === to) {
      resultEl.innerHTML = '<div class="empty"><strong>You are already there.</strong> Pick a different destination.</div>';
      return;
    }
    var a = plan(lines, from, to, 12);
    if (!a) {
      resultEl.innerHTML = '<div class="empty"><strong>No route from ' + esc(from) + ' to ' + esc(to) + ' in the guide yet.</strong> If you know how people get there, add the route under "Routes, fixes and new routes" below.</div>';
      return;
    }
    var opts = [{ label: 'Fewest changes', legs: a }];
    var b = plan(lines, from, to, 2);
    if (b && sig(b) !== sig(a) && hopsOf(b) < hopsOf(a)) opts.push({ label: 'Shortest ride', legs: b });
    if (current >= opts.length) current = 0;
    var legs = opts[current].legs, changes = legs.length - 1;
    var total = 0, allReal = true;
    legs.forEach(function (l) { var f = legFareInfo(lines[l.li], l); total += f.amt; if (!f.real) allReal = false; });

    var h = '<div class="sum"><h2>' + esc(from) + ' to ' + esc(to) + '</h2>';
    h += '<div class="stats"><div class="stat"><b>' + hopsOf(legs) + '</b><span>stops</span></div>' +
      '<div class="stat"><b>' + changes + '</b><span>' + (changes === 1 ? 'change' : 'changes') + '</span></div>' +
      '<div class="stat"><b>' + money(total) + '</b><span>' + (allReal ? 'fare reported by riders' : 'estimated fare') + '</span></div></div>';
    if (opts.length > 1) {
      h += '<div class="tabs" role="group" aria-label="Route choice">' + opts.map(function (x, i) {
        return '<button type="button" class="tab" data-tab="' + i + '" aria-pressed="' + (i === current) + '">' + x.label + '</button>';
      }).join('') + '</div>';
    }
    h += '</div>';
    legs.forEach(function (l, i) {
      if (i > 0) {
        var at = lines[legs[i - 1].li].stops[legs[i - 1].to];
        h += '<div class="change">Change vehicles at ' + esc(at) + '<small>Ask the mate where the next one loads.</small></div>';
      }
      h += legHtml(l, i, legs.length);
    });
    resultEl.innerHTML = h;
  }

  var armTimer = null;
  function renderList() {
    document.getElementById('listTitle').textContent = 'Routes in ' + CITY_NAMES[city];
    listEl.innerHTML = items.map(function (it) {
      var r = it.r, last = r.stops[r.stops.length - 1];
      var badge = '';
      if (it.hidden === 'disputed') badge = '<span class="badge bad">Hidden: reported wrong</span>';
      else if (it.hidden === 'replaced') badge = '<span class="badge">Replaced by a community fix</span>';
      else if (it.conf >= 3) badge = '<span class="badge good">Confirmed</span>';
      else if (r.origin === 'community') badge = '<span class="badge">New</span>';
      var mine = canWrite && r.by && r.by === myId;
      var mv = myVote(r.id);
      var acts = '';
      if (canWrite) {
        acts = '<button type="button" class="rbtn" data-vote="1" data-rid="' + esc(r.id) + '" aria-pressed="' + (mv === 1) + '">Correct</button>' +
          '<button type="button" class="rbtn" data-vote="-1" data-rid="' + esc(r.id) + '" aria-pressed="' + (mv === -1) + '">Wrong</button>' +
          '<button type="button" class="btn ghost small" data-fix="' + esc(r.id) + '">Suggest a fix</button>' +
          (mine ? '<button type="button" class="btn ghost small" data-rm="' + esc(r.id) + '">Remove mine</button>' : '');
      }
      return '<li><div class="t"><b>' + esc(r.stops[0]) + ' ⇄ ' + esc(last) + badge + '</b>' +
        '<span>' + r.stops.map(esc).join(' → ') + ' · full fare ' + money(r.fare) + '</span>' +
        '<span>' + trustHtml(it) + '</span></div>' + (acts ? '<div class="acts">' + acts + '</div>' : '') + '</li>';
    }).join('');
  }

  function renderAll() {
    buildItems();
    fillSelects(false);
    renderCities();
    renderNote();
    renderResult();
    renderList();
  }

  var dirty = false, pending = false;
  function scheduleRender() {
    var ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) { dirty = true; return; }
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; renderAll(); });
  }
  document.addEventListener('focusout', function () {
    if (dirty) { dirty = false; setTimeout(scheduleRender, 0); }
  });

  /* ---------- events ---------- */
  function flash(key, text) {
    flashes[key] = text; scheduleRender();
    setTimeout(function () { delete flashes[key]; scheduleRender(); }, 4000);
  }
  function disarm() {
    var b = document.querySelector('[data-rm].armed');
    if (b) { b.classList.remove('armed'); b.textContent = 'Remove mine'; }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab],[data-city],[data-vote],[data-report],[data-fix],[data-rm]');
    if (!t) return;
    if (t.hasAttribute('data-tab')) { current = +t.getAttribute('data-tab'); renderResult(); return; }
    if (t.hasAttribute('data-city')) {
      city = t.getAttribute('data-city'); current = 0; replaces = null; setFix();
      try { localStorage.setItem('trotro-city', city); } catch (er) {}
      buildItems(); fillSelects(true); renderAll(); return;
    }
    if (!db || !myId || !canWrite) return;
    if (t.hasAttribute('data-vote')) {
      castVote(t.getAttribute('data-rid'), +t.getAttribute('data-vote')); return;
    }
    if (t.hasAttribute('data-report')) {
      var i = t.getAttribute('data-report');
      var inp = document.getElementById('fare-' + i);
      var amt = parseFloat(inp && inp.value);
      var key = legKey(t.getAttribute('data-rid'), t.getAttribute('data-from'), t.getAttribute('data-to'));
      if (!(amt > 0) || amt > 500) { flash(key, 'Enter the amount you paid, for example 6.'); return; }
      reportFare(key, amt).then(function (ok) {
        if (ok) { if (inp) inp.value = ''; flash(key, 'Thanks. Your fare is counted.'); }
      });
      return;
    }
    if (t.hasAttribute('data-fix')) {
      var rid = t.getAttribute('data-fix');
      var it = items.filter(function (x) { return x.r.id === rid; })[0];
      if (!it) return;
      replaces = rid; setFix(it);
      document.getElementById('newStops').value = it.r.stops.join('\n');
      document.getElementById('newFare').value = it.r.fare;
      document.getElementById('manage').open = true;
      document.getElementById('addWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('newStops').focus();
      return;
    }
    if (t.hasAttribute('data-rm')) {
      var id = t.getAttribute('data-rm');
      if (t.classList.contains('armed')) {
        writeMine('contrib', function (d) { if (d.routes) delete d.routes[id]; return d; });
        writeMine('reports', function (d) { if (d.votes) delete d.votes[id]; return d; });
      } else {
        disarm(); t.classList.add('armed'); t.textContent = 'Tap again to remove';
        clearTimeout(armTimer); armTimer = setTimeout(disarm, 4000);
      }
    }
  });

  fromEl.addEventListener('change', function () { current = 0; renderResult(); });
  toEl.addEventListener('change', function () { current = 0; renderResult(); });
  document.getElementById('swap').addEventListener('click', function () {
    var f = fromEl.value; fromEl.value = toEl.value; toEl.value = f; current = 0; renderResult();
  });

  function setFix(it) {
    var bar = document.getElementById('fixBar');
    if (!it) { bar.hidden = true; return; }
    document.getElementById('fixText').textContent = 'Suggesting a fix for ' + it.r.stops[0] + ' ⇄ ' + it.r.stops[it.r.stops.length - 1] + '. Change the stops or fare, then press Add route.';
    bar.hidden = false;
  }
  document.getElementById('fixCancel').addEventListener('click', function () {
    replaces = null; setFix();
    document.getElementById('newStops').value = ''; document.getElementById('newFare').value = '';
  });

  var addMsg = document.getElementById('addMsg');
  document.getElementById('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    addMsg.className = 'msg err';
    if (!db || !myId || !canWrite) { addMsg.textContent = 'Adding routes is not available in this view.'; return; }
    var known = {};
    stopsNow().forEach(function (s) { known[s.toLowerCase()] = s; });
    var seen = {}, stops = [];
    document.getElementById('newStops').value.split(/[\n,>]+/).forEach(function (raw) {
      var s = raw.replace(/\s+/g, ' ').trim();
      if (!s) return;
      s = known[s.toLowerCase()] || s;
      if (!seen[s.toLowerCase()]) { seen[s.toLowerCase()] = true; stops.push(s); }
    });
    var fare = parseFloat(document.getElementById('newFare').value);
    if (stops.length < 2) { addMsg.textContent = 'Enter at least two different stops, one per line.'; return; }
    if (stops.length > 25) { addMsg.textContent = 'A route can have at most 25 stops.'; return; }
    if (stops.some(function (s) { return s.length > 40; })) { addMsg.textContent = 'Each stop name must be 40 characters or fewer.'; return; }
    if (!(fare > 0) || fare > 500) { addMsg.textContent = 'Enter the fare for the full route, for example 6.'; return; }
    var rid = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var rep = replaces, c = city;
    writeMine('contrib', function (d) {
      d.routes = d.routes || {};
      if (Object.keys(d.routes).length >= 40) throw new Error('limit');
      var r = { city: c, stops: stops, fare: fare, t: Date.now() };
      if (rep) r.replaces = rep;
      d.routes[rid] = r;
      return d;
    }).then(function (ok) {
      if (!ok) return;
      castVote(rid, 1);
      replaces = null; setFix();
      document.getElementById('newStops').value = ''; document.getElementById('newFare').value = '';
      addMsg.className = 'msg ok';
      addMsg.textContent = 'Added ' + stops[0] + ' to ' + stops[stops.length - 1] + '. Other riders can now confirm it.';
    });
  });

  /* ---------- community connection ---------- */
  function connect() {
    if (!window.claude || !window.claude.use) { dbState = 'off'; renderAll(); return; }
    Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function (r) {
      db = r[0]; var user = r[1];
      if (!db) { dbState = 'off'; renderAll(); return; }
      return Promise.all([user ? user.id() : null, user ? user.can('data.write') : null]).then(function (v) {
        myId = v[0];
        canWrite = myId !== null && v[1] !== false;
        dbState = 'on';
        function fail() { dbState = 'off'; canWrite = false; scheduleRender(); }
        db.collection('contrib').onSnapshot(function (s) {
          contribDocs = s.docs.map(function (d) { return { id: d.id, data: d.data() || {} }; });
          scheduleRender();
        }, fail);
        db.collection('reports').onSnapshot(function (s) {
          reportDocs = s.docs.map(function (d) { return { id: d.id, data: d.data() || {} }; });
          scheduleRender();
        }, fail);
        renderAll();
      });
    }).catch(function () { dbState = 'off'; renderAll(); });
  }

  buildItems();
  fillSelects(true);
  renderAll();
  connect();
})();
