(function () {
'use strict';
const $ = id => document.getElementById(id), t = $('t');
const store = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del: k => { try { localStorage.removeItem(k); } catch (e) {} }
};
const WRE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
const SRE = /[^.!?]+[.!?]+(?=\s|$)|[^.!?\s][^.!?]*$/g;
const STOP = new Set('the a an and or but of to in on at for with is are was were be been it its this that as by from not i you he she we they them his her our your my me so if then than too very can will just'.split(' '));
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const nf = x => (+x).toLocaleString();
const fmt = s => {
  s = Math.round(s);
  if (s < 60) return s + ' sec';
  if (s < 3600) return Math.floor(s / 60) + ' min' + (s % 60 ? ' ' + s % 60 + ' sec' : '');
  return Math.floor(s / 3600) + ' hr ' + Math.round(s % 3600 / 60) + ' min';
};
const syl = w => {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return w ? 1 : 0;
  return Math.max(1, (w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g) || []).length);
};
let msgTimer;
function say(text, ms) {
  const m = $('msg'); m.textContent = text;
  clearTimeout(msgTimer);
  if (ms) msgTimer = setTimeout(() => { m.textContent = ''; }, ms);
}

/* ---------- settings ---------- */
const PRIMARY = ['words', 'chars', 'sentences', 'paragraphs', 'level', 'readtime', 'speaktime'];
const DEF = { theme: 'auto', font: 'serif', size: 19, read: 238, speak: 150, hand: 20, page: 500, voicecmd: true, details: PRIMARY.slice() };
let S = Object.assign({}, DEF, loadPrefs());
const saveSettings = () => { store.set('wcp-settings', JSON.stringify(S)); applyPrefs(S); };

/* ---------- details rows ---------- */
const ROWS = [
  { id: 'words', label: 'Words', val: a => a.W },
  { id: 'chars', label: 'Characters', val: a => a.chars },
  { id: 'sentences', label: 'Sentences', val: a => a.S },
  { id: 'paragraphs', label: 'Paragraphs', val: a => a.paras },
  { id: 'level', label: 'Reading level', val: a => a.level(), tip: () => 'Estimated U.S. school grade needed to follow the text (Flesch–Kincaid).' },
  { id: 'readtime', label: 'Reading time', val: a => fmt(a.W / S.read * 60), tip: () => 'Based on a silent reading speed of ' + S.read + ' words per minute. Change it in Settings.' },
  { id: 'speaktime', label: 'Speaking time', val: a => fmt(a.W / S.speak * 60), tip: () => 'Based on a speaking pace of ' + S.speak + ' words per minute. Change it in Settings.' },
  { id: 'handtime', label: 'Handwriting time', val: a => fmt(a.W / S.hand * 60), tip: () => 'Based on handwriting at ' + S.hand + ' words per minute. Change it in Settings.' },
  { id: 'publisher', label: 'Publisher word count', val: a => Math.round(a.chars / 6), tip: () => 'Many publishers estimate length as characters (with spaces) divided by 6.' },
  { id: 'avgsw', label: 'Avg. sentence (words)', val: a => a.S ? (a.W / a.S).toFixed(1) : 0, tip: () => 'Average number of words per sentence.' },
  { id: 'avgsc', label: 'Avg. sentence (chars)', val: a => a.S ? (a.sa.reduce((x, s) => x + s.length, 0) / a.S).toFixed(1) : 0, tip: () => 'Average number of characters per sentence.' },
  { id: 'cn', label: 'Characters, no spaces', val: a => a.v.replace(/\s/g, '').length },
  { id: 'uq', label: 'Unique words', val: a => new Set(a.w.map(x => x.toLowerCase())).size },
  { id: 'awl', label: 'Average word length', val: a => a.W ? (a.w.join('').length / a.W).toFixed(1) : 0 },
  { id: 'lw', label: 'Longest word', val: a => a.w.reduce((x, y) => y.length > x.length ? y : x, '') || '–' },
  { id: 'ln', label: 'Lines', val: a => a.v ? a.v.split('\n').length : 0 },
  { id: 'sy', label: 'Syllables', val: a => a.syl() },
  { id: 'lsent', label: 'Longest sentence', val: a => a.sl.length ? Math.max(...a.sl) : 0, tip: () => 'In words.' },
  { id: 'ssent', label: 'Shortest sentence', val: a => a.sl.length ? Math.min(...a.sl) : 0, tip: () => 'In words.' },
  { id: 'spp', label: 'Sentences per paragraph', val: a => a.paras ? (a.S / a.paras).toFixed(1) : 0 },
  { id: 'nums', label: 'Numbers', val: a => (a.v.match(/\d+(?:[.,]\d+)*/g) || []).length },
  { id: 'pages', label: 'Pages', val: a => (a.W / S.page).toFixed(1), tip: () => 'Based on ' + S.page + ' words per page. Change it in Settings.' }
];
let showAll = false;
const pills = {};
function buildDetails() {
  const box = $('details'); box.replaceChildren();
  ROWS.forEach(r => {
    const d = document.createElement('div'); d.className = 'row'; d.dataset.id = r.id;
    const l = document.createElement('span'); l.textContent = r.label;
    if (r.tip) {
      const tp = document.createElement('span'); tp.className = 'tip'; tp.tabIndex = 0; tp.setAttribute('role', 'note');
      tp.dataset.tip = r.tip(); tp.setAttribute('aria-label', r.tip()); tp.textContent = '?'; l.appendChild(tp);
    }
    const p = document.createElement('span'); p.className = 'pill'; p.textContent = '0'; pills[r.id] = p;
    d.append(l, p); box.appendChild(d);
  });
  rowVis();
}
function rowVis() {
  const vis = new Set(S.details);
  $('details').querySelectorAll('.row').forEach(r => { r.hidden = !(showAll || vis.has(r.dataset.id)); });
  const hid = ROWS.filter(r => !vis.has(r.id)).length;
  $('morebtn').hidden = hid === 0;
  $('morebtn').textContent = showAll ? 'Fewer details' : 'More (' + hid + ')';
}

/* ---------- analysis ---------- */
function analyze(v) {
  const w = v.match(WRE) || [], W = w.length;
  const sa = (v.match(SRE) || []).filter(s => /[\p{L}\p{N}]/u.test(s)).map(s => s.trim());
  const sl = sa.map(s => (s.match(WRE) || []).length);
  const a = { v, w, W, sa, sl, S: sa.length, chars: v.length, paras: v.split(/\n/).filter(x => x.trim()).length };
  let sc = null; a.syl = () => sc === null ? (sc = w.reduce((x, y) => x + syl(y), 0)) : sc;
  a.level = () => {
    if (W < 5 || !a.S) return 'N/A';
    const g = Math.max(0, Math.round(.39 * W / a.S + 11.8 * a.syl() / W - 15.59));
    return g >= 13 ? 'College+' : 'Grade ' + g;
  };
  return a;
}

/* ---------- documents ---------- */
let docs = [], cur = '', autosave = store.get('wcp-auto') !== '0', prev = 0, saveT;
function loadDocs() {
  if (autosave) { try { docs = JSON.parse(store.get('wcp-docs') || '[]'); } catch (e) { docs = []; } }
  if (!Array.isArray(docs) || !docs.length) {
    const old = autosave ? store.get('wcp-text') : '';
    docs = [{ id: uid(), name: 'Document 1', text: old || '' }];
  }
  cur = store.get('wcp-cur');
  if (!docs.some(d => d.id === cur)) cur = docs[0].id;
}
const curDoc = () => docs.find(d => d.id === cur);
function persist() {
  if (!autosave) { $('savestat').textContent = 'Auto-save off'; return; }
  const ok = store.set('wcp-docs', JSON.stringify(docs)) && store.set('wcp-cur', cur);
  $('savestat').textContent = ok ? 'Saved in this browser' : 'Could not save (browser storage full or blocked)';
}
function persistSoon() { clearTimeout(saveT); saveT = setTimeout(persist, 300); }
function renderDocs() {
  const sel = $('docsel'); sel.replaceChildren();
  docs.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = d.name; sel.appendChild(o); });
  sel.value = cur;
}
function switchDoc(id) {
  curDoc().text = t.value; cur = id; t.value = curDoc().text;
  prev = (t.value.match(WRE) || []).length; renderDocs(); update(true); persist();
}
function newDoc(name, text) {
  curDoc().text = t.value;
  const d = { id: uid(), name: name || 'Document ' + (docs.length + 1), text: text || '' };
  docs.push(d); switchDoc(d.id); t.focus(); return d;
}
let renameMode = false;
$('docnew').onclick = () => newDoc();
$('docsel').onchange = e => switchDoc(e.target.value);
$('docren').onclick = () => { $('namein').value = curDoc().name; $('named').showModal(); $('namein').select(); };
$('nameok').onclick = e => { e.preventDefault(); const n = $('namein').value.trim(); if (n) { curDoc().name = n.slice(0, 60); renderDocs(); persist(); } $('named').close(); };
$('docdel').onclick = () => {
  if (!confirm('Delete “' + curDoc().name + '”? This cannot be undone.')) return;
  if (docs.length === 1) { t.value = ''; curDoc().text = ''; prev = 0; update(true); persist(); return; }
  const i = docs.findIndex(d => d.id === cur); docs.splice(i, 1);
  cur = docs[Math.max(0, i - 1)].id; t.value = curDoc().text; prev = (t.value.match(WRE) || []).length; renderDocs(); update(true); persist();
};

/* ---------- update ---------- */
let raf = 0;
function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); }
function update(first) {
  const v = t.value, a = analyze(v);
  $('hw').textContent = nf(a.W); $('hc').textContent = nf(a.chars);
  $('fw').textContent = nf(a.W) + ' words ' + nf(a.chars) + ' characters';
  const vis = new Set(S.details);
  ROWS.forEach(r => { if (showAll || vis.has(r.id)) { const x = r.val(a); pills[r.id].textContent = typeof x === 'number' ? nf(x) : x; } });
  flow(a); keywords(a.w); goalUI(a);
  if (!first) {
    if (a.W > prev) addActivity(a.W - prev);
    curDoc().text = v; persistSoon();
  }
  prev = a.W;
}

/* ---------- flow score ---------- */
const CATS = [['1–5', 5], ['6–10', 10], ['11–15', 15], ['16–25', 25], ['26–35', 35], ['36+', 1e9]];
const catOf = l => CATS.findIndex(c => l <= c[1]);
function buildLegend() {
  const lg = $('legend'); lg.replaceChildren();
  CATS.forEach((c, i) => { const s = document.createElement('span'); s.className = 'f' + i; s.id = 'lg' + i; lg.appendChild(s); });
  const r = document.createElement('span'); r.className = 'rpk'; r.textContent = '3+ alike in a row'; lg.appendChild(r);
}
function flow(a) {
  const on = $('flowsw').checked; $('flowoff').hidden = on; $('flowon').hidden = !on; if (!on) return;
  const b = a.sl.map(catOf), N = b.length, rp = b.map(() => false);
  for (let i = 0; i < N;) { let j = i; while (j < N && b[j] === b[i]) j++; if (j - i >= 3) for (let k = i; k < j; k++) rp[k] = true; i = j; }
  const cnt = CATS.map(() => 0); b.forEach(x => cnt[x]++);
  CATS.forEach((c, i) => { $('lg' + i).textContent = c[0] + ' words · ' + cnt[i]; });
  if (N < 3) { $('fs').textContent = '–'; $('fsl').textContent = 'Write at least 3 sentences.'; }
  else {
    const H = -cnt.filter(x => x).reduce((s, x) => s + x / N * Math.log(x / N), 0);
    const variety = H / Math.log(Math.min(6, N)), rr = rp.filter(Boolean).length / N;
    const sc = Math.round(clamp(.75 * variety + .25 * (1 - rr), 0, 1) * 100);
    $('fs').textContent = sc + '%';
    $('fsl').textContent = sc >= 75 ? 'Varied rhythm' : sc >= 50 ? 'Good flow' : sc >= 25 ? 'Fairly even rhythm' : 'Repetitive rhythm';
  }
  $('fview').replaceChildren(...a.sa.flatMap((s, i) => { const e = document.createElement('span'); e.className = 'f' + b[i] + (rp[i] ? ' rp' : ''); e.textContent = s; return [e, document.createTextNode(' ')]; }));
}
$('flowsw').onchange = () => { store.set('wcp-flow', $('flowsw').checked ? '1' : '0'); update(true); };

/* ---------- keywords ---------- */
let n = 1;
function keywords(w) {
  const lw = w.map(x => x.toLowerCase()), c = {};
  for (let i = 0; i + n <= lw.length; i++) {
    const g = lw.slice(i, i + n);
    if (n === 1 ? (g[0].length < 3 || STOP.has(g[0])) : g.every(x => STOP.has(x)) || STOP.has(g[0]) || STOP.has(g[n - 1])) continue;
    const k = g.join(' '); c[k] = (c[k] || 0) + 1;
  }
  const top = Object.entries(c).filter(e => n === 1 || e[1] > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10), max = top[0] ? top[0][1] : 1;
  $('kw').replaceChildren(...top.map(([k, x]) => {
    const li = document.createElement('li'); li.innerHTML = '<span></span><span></span><i></i>';
    li.children[0].textContent = k; li.children[1].textContent = x + ' · ' + (x / lw.length * 100).toFixed(1) + '%'; li.children[2].style.width = x / max * 100 + '%'; return li;
  }));
  $('kwe').hidden = top.length > 0; $('kwe').textContent = n > 1 ? 'No phrase repeats yet.' : 'Start typing to see your most-used words.';
}
document.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
  n = +b.dataset.n; document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); update(true);
});

/* ---------- goals ---------- */
let goal = null;
try { goal = JSON.parse(store.get('wcp-goal2') || 'null'); } catch (e) {}
if (!goal && +store.get('wcp-goal')) goal = { type: 'words', min: +store.get('wcp-goal'), max: 0 };
const UNITS = { words: 'words', chars: 'characters', sentences: 'sentences', pages: 'pages' };
function goalUI(a) {
  const bar = $('goalbar');
  if (!goal || (!goal.min && !goal.max)) { bar.classList.remove('show'); return; }
  const val = goal.type === 'words' ? a.W : goal.type === 'chars' ? a.chars : goal.type === 'sentences' ? a.S : +(a.W / S.page).toFixed(1);
  const u = UNITS[goal.type], tr = $('track');
  let msg, cls = '';
  if (goal.min && val < goal.min) msg = nf(+(goal.min - val).toFixed(1)) + ' ' + u + ' to reach the minimum';
  else if (goal.max && val > goal.max) { msg = nf(+(val - goal.max).toFixed(1)) + ' ' + u + ' over the maximum'; cls = 'over'; }
  else { msg = goal.max ? 'Within your target range' : 'Goal reached'; cls = 'ok'; }
  const range = (goal.min && goal.max) ? nf(goal.min) + '–' + nf(goal.max) : goal.min ? nf(goal.min) + '+' : 'up to ' + nf(goal.max);
  $('goaltxt').textContent = nf(val) + ' / ' + range + ' ' + u + ' · ' + msg;
  const target = goal.max || goal.min;
  $('goalfill').style.width = clamp(val / target * 100, 0, 100) + '%';
  tr.className = 'track ' + cls;
  const mk = $('goalmin'); mk.style.display = goal.min && goal.max ? 'block' : 'none'; if (goal.max) mk.style.left = clamp(goal.min / goal.max * 100, 0, 100) + '%';
  bar.classList.add('show');
}
$('goalbtn').onclick = () => {
  $('gtype').value = goal ? goal.type : 'words'; $('gmin').value = goal && goal.min || ''; $('gmax').value = goal && goal.max || ''; $('goald').showModal();
};
$('goalok').onclick = e => {
  e.preventDefault();
  let mn = Math.max(0, +$('gmin').value || 0), mx = Math.max(0, +$('gmax').value || 0);
  if (mn && mx && mn > mx) [mn, mx] = [mx, mn];
  goal = mn || mx ? { type: $('gtype').value, min: mn, max: mx } : null;
  store.set('wcp-goal2', JSON.stringify(goal)); $('goald').close(); update(true);
};
$('goalclr').onclick = e => { e.preventDefault(); goal = null; store.set('wcp-goal2', 'null'); store.del('wcp-goal'); $('goald').close(); update(true); };

/* ---------- activity ---------- */
const day = o => { const d = new Date(); d.setDate(d.getDate() - o); return d.toLocaleDateString('en-CA'); };
function readAct() { try { return JSON.parse(store.get('wcp-act') || '{}'); } catch (e) { return {}; } }
function addActivity(k) { const a = readAct(); a[day(0)] = (a[day(0)] || 0) + k; store.set('wcp-act', JSON.stringify(a)); }
$('actbtn').onclick = () => {
  const a = readAct(), days = [6, 5, 4, 3, 2, 1, 0].map(o => [day(o), a[day(o)] || 0]), max = Math.max(1, ...days.map(d => d[1]));
  $('bars').replaceChildren(...days.map(([d, x]) => {
    const e = document.createElement('div'); e.innerHTML = '<span></span><i></i><span></span>';
    e.children[0].textContent = x; e.children[1].style.height = (x / max * 100) + 'px';
    e.children[2].textContent = new Date(d + 'T12:00').toLocaleDateString(undefined, { weekday: 'short' }); return e;
  }));
  $('actd').showModal();
};

/* ---------- text insertion helpers ---------- */
function insert(text) {
  t.focus();
  if (!document.execCommand('insertText', false, text)) t.setRangeText(text, t.selectionStart, t.selectionEnd, 'end');
  update();
}
function replaceAll(text) { t.focus(); t.select(); if (!document.execCommand('insertText', false, text)) t.value = text; update(); }
const cases = {
  upper: s => s.toUpperCase(), lower: s => s.toLowerCase(),
  title: s => s.toLowerCase().replace(/(^|[\s(“"'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
  sentence: s => s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
};
document.querySelectorAll('[data-case]').forEach(b => b.onclick = () => {
  $('casemenu').classList.remove('open'); t.focus();
  if (t.selectionStart === t.selectionEnd) t.select();
  insert(cases[b.dataset.case](t.value.slice(t.selectionStart, t.selectionEnd)));
});
$('casebtn').onclick = () => $('casemenu').classList.toggle('open');
$('dlbtn').onclick = () => $('dlmenu').classList.toggle('open');
document.addEventListener('click', e => { document.querySelectorAll('.tools .menu.open').forEach(m => { if (!m.contains(e.target)) m.classList.remove('open'); }); });

$('paste').onclick = async () => {
  try { insert(await navigator.clipboard.readText()); }
  catch (e) { t.focus(); alert('Your browser blocked clipboard access. Press Ctrl+V (or Cmd+V) in the text box instead.'); }
};
$('undo').onclick = () => { t.focus(); document.execCommand('undo'); update(); };
$('redo').onclick = () => { t.focus(); document.execCommand('redo'); update(); };
$('clear').onclick = () => {
  if (t.value && !confirm('Clear all text in this document?')) return;
  t.value = ''; curDoc().text = ''; prev = 0; update(true); persist(); t.focus();
};

/* ---------- upload ---------- */
$('upload').onclick = () => $('file').click();
$('file').onchange = e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (f.size > 5e6) { alert('That file is larger than 5 MB. Please choose a smaller text file.'); return; }
  const r = new FileReader();
  r.onload = () => {
    const txt = String(r.result).replace(/\r\n?/g, '\n'), name = f.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Uploaded file';
    if (!t.value.trim()) { curDoc().name = name; t.value = txt; renderDocs(); update(true); curDoc().text = txt; prev = (txt.match(WRE) || []).length; persist(); update(true); }
    else { const d = newDoc(name, txt); t.value = txt; d.text = txt; update(true); persist(); }
    say('Loaded “' + name + '”', 3000);
  };
  r.onerror = () => alert('Sorry, that file could not be read.');
  r.readAsText(f);
};

/* ---------- download ---------- */
const fname = () => (curDoc().name || 'my-text').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'my-text';
function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
$('dltxt').onclick = () => { $('dlmenu').classList.remove('open'); saveBlob(new Blob([t.value], { type: 'text/plain;charset=utf-8' }), fname() + '.txt'); };
$('dlpdf').onclick = () => { $('dlmenu').classList.remove('open'); saveBlob(makePDF(t.value), fname() + '.pdf'); };

/* Minimal text-only PDF writer (Helvetica, Latin characters). */
function makePDF(text) {
  const HW = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  const MAP = { 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2013: 0x96, 0x2014: 0x97, 0x2026: 0x85, 0x2022: 0x95, 0x20AC: 0x80, 0x2122: 0x99 };
  const FS = 11, LEAD = 15, W = 612, H = 792, M = 72, MAXW = W - 2 * M;
  const enc = s => { let o = ''; for (const ch of s) { let c = ch.codePointAt(0); if (c === 9) c = 32; if (MAP[c]) c = MAP[c]; else if (c > 255 || (c < 32) || (c > 126 && c < 160)) c = 63; o += String.fromCharCode(c); } return o; };
  const cw = c => (c >= 32 && c <= 126 ? HW[c - 32] : 556) * FS / 1000;
  const lines = [];
  enc(text.replace(/\r\n?/g, '\n')).split('\n').forEach(par => {
    if (!par.trim()) { lines.push(''); return; }
    let line = '', w = 0;
    par.split(/( +)/).forEach(tok => {
      const tw = [...tok].reduce((s, ch) => s + cw(ch.charCodeAt(0)), 0);
      if (w + tw > MAXW && line.trim()) { lines.push(line.replace(/\s+$/, '')); line = ''; w = 0; if (/^ +$/.test(tok)) return; }
      if (tw > MAXW) { for (const ch of tok) { const c = cw(ch.charCodeAt(0)); if (w + c > MAXW) { lines.push(line); line = ''; w = 0; } line += ch; w += c; } return; }
      line += tok; w += tw;
    });
    lines.push(line);
  });
  const per = Math.floor((H - 2 * M) / LEAD), pages = [];
  for (let i = 0; i < lines.length; i += per) pages.push(lines.slice(i, i + per));
  if (!pages.length) pages.push(['']);
  const esc = s => s.replace(/[\\()]/g, '\\$&');
  const objs = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const kids = pages.map((_, i) => (4 + i * 2) + ' 0 R').join(' ');
  objs[2] = '<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>';
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  pages.forEach((pl, i) => {
    let s = 'BT /F1 ' + FS + ' Tf ' + LEAD + ' TL ' + M + ' ' + (H - M - FS) + ' Td\n';
    pl.forEach(l => { s += '(' + esc(l) + ') Tj T*\n'; });
    s += 'ET';
    objs[4 + i * 2] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + (5 + i * 2) + ' 0 R >>';
    objs[5 + i * 2] = '<< /Length ' + s.length + ' >>\nstream\n' + s + '\nendstream';
  });
  let out = '%PDF-1.4\n', off = [];
  for (let i = 1; i < objs.length; i++) { off[i] = out.length; out += i + ' 0 obj\n' + objs[i] + '\nendobj\n'; }
  const x = out.length;
  out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
  for (let i = 1; i < objs.length; i++) out += String(off[i]).padStart(10, '0') + ' 00000 n \n';
  out += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF';
  const u = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) u[i] = out.charCodeAt(i) & 255;
  return new Blob([u], { type: 'application/pdf' });
}

/* ---------- print ---------- */
$('print').onclick = () => { $('ptitle').textContent = curDoc().name; $('pbody').textContent = t.value; window.print(); };

/* ---------- find & replace ---------- */
function frRegex() {
  const q = $('frq').value; if (!q) return null;
  let src = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if ($('frw').checked) src = '(?<![\\p{L}\\p{N}_])' + src + '(?![\\p{L}\\p{N}_])';
  return new RegExp(src, 'gu' + ($('frc').checked ? '' : 'i'));
}
function frCount() {
  const re = frRegex(); if (!re) { $('frinfo').textContent = ''; return 0; }
  const c = (t.value.match(re) || []).length; $('frinfo').textContent = c + (c === 1 ? ' match' : ' matches'); return c;
}
function frNext(back) {
  const re = frRegex(); if (!re) return false; const v = t.value, hits = [];
  let m; while ((m = re.exec(v))) { hits.push([m.index, m.index + m[0].length]); if (!m[0].length) re.lastIndex++; }
  if (!hits.length) { $('frinfo').textContent = 'No matches'; return false; }
  let h;
  if (back) { const p = t.selectionStart; h = [...hits].reverse().find(x => x[0] < p) || hits[hits.length - 1]; }
  else { const p = t.selectionEnd; h = hits.find(x => x[0] >= p) || hits[0]; }
  t.focus(); t.setSelectionRange(h[0], h[1]);
  const lh = parseFloat(getComputedStyle(t).lineHeight) || 30, before = v.slice(0, h[0]).split('\n').length;
  t.scrollTop = Math.max(0, before * lh - t.clientHeight / 2);
  $('frinfo').textContent = hits.length + (hits.length === 1 ? ' match' : ' matches'); return true;
}
$('frq').oninput = frCount; $('frc').onchange = $('frw').onchange = frCount;
$('frnext').onclick = () => frNext(false); $('frprev').onclick = () => frNext(true);
$('frq').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); frNext(e.shiftKey); } };
$('frone').onclick = () => {
  const re = frRegex(); if (!re) return;
  const sel = t.value.slice(t.selectionStart, t.selectionEnd);
  if (sel && new RegExp('^(?:' + re.source + ')$', re.flags.replace('g', '')).test(sel)) { insert($('frr').value); }
  frNext(false); frCount();
};
$('frall').onclick = () => {
  const re = frRegex(); if (!re) return; const c = frCount(); if (!c) return;
  replaceAll(t.value.replace(re, () => $('frr').value)); $('frinfo').textContent = 'Replaced ' + c; 
};
function openFind() {
  const s = t.value.slice(t.selectionStart, t.selectionEnd);
  if (s && s.length < 80 && !/\n/.test(s)) $('frq').value = s;
  if (!$('frd').open) $('frd').show(); $('frq').focus(); $('frq').select(); frCount();
}
$('find').onclick = openFind; $('frclose').onclick = () => $('frd').close();
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && document.activeElement === t) { e.preventDefault(); openFind(); } });

/* ---------- clean text ---------- */
const CLEAN = {
  spaces: s => s.replace(/[ \t\u00A0]{2,}/g, ' '),
  trim: s => s.split('\n').map(l => l.trim()).join('\n'),
  blank: s => s.replace(/\n\s*\n+/g, '\n').replace(/^\n+|\n+$/g, ''),
  join: s => s.replace(/\s*\n\s*/g, ' ').trim(),
  quotes: s => s.replace(/[‘’‚′]/g, "'").replace(/[“”„″]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...'),
  tags: s => s.replace(/<[^>]*>/g, ''),
  dupes: s => { const seen = new Set(); return s.split('\n').filter(l => { const k = l.trim(); if (!k) return true; if (seen.has(k)) return false; seen.add(k); return true; }).join('\n'); },
  emoji: s => s.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
};
const CLEAN_ORDER = ['tags', 'quotes', 'emoji', 'trim', 'spaces', 'dupes', 'blank', 'join'];
$('cleanok').onclick = e => {
  e.preventDefault();
  const on = CLEAN_ORDER.filter(k => $('cl-' + k).checked); if (!on.length) { $('clean').close(); return; }
  const hasSel = t.selectionStart !== t.selectionEnd;
  const run = s => on.reduce((x, k) => CLEAN[k](x), s);
  t.focus();
  if (hasSel) insert(run(t.value.slice(t.selectionStart, t.selectionEnd))); else replaceAll(run(t.value));
  $('clean').close(); say('Text cleaned. Use Undo to revert.', 4000);
};
$('cleanbtn').onclick = () => { $('cleanscope').textContent = t.selectionStart !== t.selectionEnd ? 'Applies to the selected text.' : 'Applies to the whole document.'; $('clean').showModal(); };

/* ---------- proof read (text to speech) ---------- */
let reading = false;
function speechChunks(text) {
  const out = []; let buf = '';
  for (const s of text.split(/(?<=[.!?])\s+|\n+/).filter(x => x.trim())) {
    if (s.length > 200) { if (buf) { out.push(buf); buf = ''; } out.push(...(s.match(/[\s\S]{1,200}(?=\s|$)|\S+/g) || [])); continue; }
    if ((buf + ' ' + s).length > 200) { out.push(buf); buf = s; } else buf = buf ? buf + ' ' + s : s;
  }
  if (buf) out.push(buf); return out.map(x => x.trim()).filter(Boolean);
}
function stopRead() { reading = false; if ('speechSynthesis' in window) speechSynthesis.cancel(); $('proof').classList.remove('on'); $('proof').lastChild.textContent = 'Proof read'; }
$('proof').onclick = () => {
  if (!('speechSynthesis' in window)) { alert('Your browser does not support reading text aloud.'); return; }
  if (reading) { stopRead(); return; }
  const txt = t.selectionStart !== t.selectionEnd ? t.value.slice(t.selectionStart, t.selectionEnd) : t.value;
  if (!txt.trim()) { say('Type or paste some text first.', 3000); return; }
  const parts = speechChunks(txt); speechSynthesis.cancel(); reading = true;
  $('proof').classList.add('on'); $('proof').lastChild.textContent = 'Stop';
  parts.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c); u.rate = clamp(S.speak / 150, .5, 2); u.lang = navigator.language || 'en-US';
    if (i === parts.length - 1) { u.onend = u.onerror = () => { if (reading) stopRead(); }; }
    speechSynthesis.speak(u);
  });
};
window.addEventListener('beforeunload', () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); });

/* ---------- talk to type (speech recognition) ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false;
function spokenFix(s) {
  if (!S.voicecmd) return s;
  return s.replace(/\s*\bnew paragraph\b\s*/gi, '\n\n').replace(/\s*\bnew line\b\s*/gi, '\n').replace(/\s+\b(?:period|full stop)\b/gi, '.')
    .replace(/\s+\bcomma\b/gi, ',').replace(/\s+\bquestion mark\b/gi, '?').replace(/\s+\bexclamation (?:mark|point)\b/gi, '!');
}
function stopTalk() { listening = false; try { rec && rec.stop(); } catch (e) {} $('talk').classList.remove('on'); $('talk').lastChild.textContent = 'Talk to type'; say('', 0); }
$('talk').onclick = () => {
  if (!SR) { alert('Voice typing is not supported in this browser. Chrome, Edge and Safari support it.'); return; }
  if (listening) { stopTalk(); return; }
  rec = new SR(); rec.continuous = true; rec.interimResults = false; rec.lang = navigator.language || 'en-US';
  rec.onresult = e => {
    for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) {
      let s = spokenFix(e.results[i][0].transcript.trim()); if (!s) continue;
      t.focus(); const p = t.value.slice(0, t.selectionStart).slice(-1);
      if (p && !/\s/.test(p) && !/^[.,?!\n]/.test(s)) s = ' ' + s;
      insert(s);
    }
  };
  rec.onend = () => { if (listening) { try { rec.start(); } catch (e) { stopTalk(); } } };
  rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { alert('Microphone access was blocked. Allow it in your browser’s site settings, then try again.'); stopTalk(); } };
  try { rec.start(); listening = true; $('talk').classList.add('on'); $('talk').lastChild.textContent = 'Stop'; say('Listening… speak now', 0); } catch (e) { stopTalk(); }
};

/* ---------- typing speed test ---------- */
const PASS = [
  'The best way to improve your typing is to practice a little every day. Keep your eyes on the screen, rest your fingers on the home row, and let accuracy come before speed. Speed will follow on its own.',
  'A good draft rarely appears all at once. Write the messy version first, then read it aloud, trim the extra words, and fix the sentences that trip you up. Clear writing is mostly careful editing.',
  'On a quiet morning the town woke slowly. Shopkeepers lifted their shutters, bakers slid warm loaves onto the counter, and the first bus rolled down the hill with its lights still on.',
  'Whether you write essays, emails, or product pages, knowing your word count helps you stay on target. Set a goal, check your progress as you type, and stop when the message is complete.',
  'Rain tapped against the window while the kettle began to hum. She opened her notebook, wrote the date at the top of the page, and started with the first sentence that came to mind.'
];
const tt = { p: '', start: 0, done: false, iv: 0 };
function ttRender() {
  const v = $('ttin').value, box = $('ttp'); box.replaceChildren();
  [...tt.p].forEach((ch, i) => { const s = document.createElement('span'); s.textContent = ch; s.className = i < v.length ? (v[i] === ch ? 'ok' : 'bad') : i === v.length ? 'cur' : ''; box.appendChild(s); });
}
function ttStats(final) {
  const v = $('ttin').value; if (!tt.start) { $('ttwpm').textContent = '0'; $('ttacc').textContent = '100%'; $('ttsec').textContent = '0s'; return; }
  const sec = (performance.now() - tt.start) / 1000, ok = [...v].filter((c, i) => c === tt.p[i]).length;
  $('ttwpm').textContent = Math.round(ok / 5 / (Math.max(sec, 1) / 60)); $('ttacc').textContent = (v.length ? Math.round(ok / v.length * 100) : 100) + '%'; $('ttsec').textContent = Math.round(sec) + 's';
  if (final) $('ttdone').hidden = false;
}
function ttNew() {
  clearInterval(tt.iv); tt.p = PASS[Math.floor(Math.random() * PASS.length)]; tt.start = 0; tt.done = false;
  $('ttin').value = ''; $('ttin').disabled = false; $('ttdone').hidden = true; ttRender(); ttStats(); $('ttin').focus();
}
$('ttin').oninput = () => {
  if (tt.done) return; const v = $('ttin').value;
  if (!tt.start && v) { tt.start = performance.now(); tt.iv = setInterval(ttStats, 300); }
  ttRender();
  if (v.length >= tt.p.length) { tt.done = true; clearInterval(tt.iv); $('ttin').disabled = true; ttStats(true); } else ttStats();
};
$('ttin').onpaste = e => e.preventDefault();
$('ttagain').onclick = ttNew; $('ttclose').onclick = () => { clearInterval(tt.iv); $('ttd').close(); };
$('ttd').addEventListener('close', () => clearInterval(tt.iv));
$('typing').onclick = () => { $('ttd').showModal(); ttNew(); };

/* ---------- settings ---------- */
function buildSettings() {
  const g = $('setdetails'); g.replaceChildren();
  ROWS.forEach(r => {
    const l = document.createElement('label'); l.className = 'chk';
    const c = document.createElement('input'); c.type = 'checkbox'; c.value = r.id; c.checked = S.details.includes(r.id);
    c.onchange = () => { S.details = ROWS.map(x => x.id).filter(id => id === r.id ? c.checked : S.details.includes(id)); saveSettings(); rowVis(); update(true); };
    l.append(c, document.createTextNode(' ' + r.label)); g.appendChild(l);
  });
}
function syncSettingsUI() {
  $('settheme').value = S.theme; $('setfont').value = S.font; $('setsize').value = S.size; $('sizeout').textContent = S.size + ' px';
  $('setread').value = S.read; $('setspeak').value = S.speak; $('sethand').value = S.hand; $('setpage').value = S.page; $('setvoice').checked = S.voicecmd;
}
const bindNum = (id, key, lo, hi) => $(id).onchange = () => { S[key] = clamp(Math.round(+$(id).value) || DEF[key], lo, hi); $(id).value = S[key]; saveSettings(); buildDetails(); update(true); };
$('settheme').onchange = () => { S.theme = $('settheme').value; saveSettings(); };
$('setfont').onchange = () => { S.font = $('setfont').value; saveSettings(); };
$('setsize').oninput = () => { S.size = +$('setsize').value; $('sizeout').textContent = S.size + ' px'; saveSettings(); };
bindNum('setread', 'read', 50, 1000); bindNum('setspeak', 'speak', 50, 400); bindNum('sethand', 'hand', 5, 100); bindNum('setpage', 'page', 100, 2000);
$('setvoice').onchange = () => { S.voicecmd = $('setvoice').checked; saveSettings(); };
$('setreset').onclick = () => { S = Object.assign({}, DEF, { details: PRIMARY.slice() }); saveSettings(); syncSettingsUI(); buildSettings(); buildDetails(); update(true); };
$('settingsbtn').onclick = () => { syncSettingsUI(); buildSettings(); $('setd').showModal(); };
$('setok').onclick = () => $('setd').close();

/* ---------- misc buttons ---------- */
$('morebtn').onclick = () => { showAll = !showAll; rowVis(); update(true); };
$('actok').onclick = () => $('actd').close();
$('goalcancel').onclick = e => { e.preventDefault(); $('goald').close(); };
$('basic').onclick = () => { const b = document.body.classList.toggle('basic'); $('basic').lastChild.textContent = b ? 'Full view' : 'Go basic'; store.set('wcp-basic', b ? '1' : '0'); };
const autoUI = () => { $('autosave').classList.toggle('on', autosave); $('autosave').lastChild.textContent = 'Auto-save ' + (autosave ? 'on' : 'off'); };
$('autosave').onclick = () => {
  if (autosave) {
    if (!confirm('Turn auto-save off? Saved documents in this browser will be deleted, and your text will be lost when you leave the page.')) return;
    autosave = false; store.set('wcp-auto', '0'); store.del('wcp-docs'); store.del('wcp-cur'); store.del('wcp-text');
  } else { autosave = true; store.set('wcp-auto', '1'); }
  autoUI(); persist();
};
const u = encodeURIComponent(location.href), ti = encodeURIComponent(document.title);
const SH = { fb: 'https://www.facebook.com/sharer/sharer.php?u=' + u, x: 'https://twitter.com/intent/tweet?url=' + u + '&text=' + ti, li: 'https://www.linkedin.com/sharing/share-offsite/?url=' + u, rd: 'https://www.reddit.com/submit?url=' + u + '&title=' + ti, em: 'mailto:?subject=' + ti + '&body=' + u };
document.querySelectorAll('[data-sh]').forEach(a => a.href = SH[a.dataset.sh]);
t.addEventListener('input', schedule);
window.addEventListener('beforeunload', () => { if (autosave) { curDoc().text = t.value; persist(); } });

/* ---------- init ---------- */
loadDocs(); t.value = curDoc().text; renderDocs(); buildLegend(); buildDetails();
$('flowsw').checked = store.get('wcp-flow') === '1';
prev = (t.value.match(WRE) || []).length;
autoUI(); update(true); persist();
if (store.get('wcp-basic') === '1') $('basic').click();
const TOOLS = { find: openFind, clean: () => $('cleanbtn').click(), typing: () => $('typing').click(), goal: () => $('goalbtn').click(), settings: () => $('settingsbtn').click(), activity: () => $('actbtn').click() };
const q = new URLSearchParams(location.search).get('tool');
if (q && TOOLS[q]) setTimeout(TOOLS[q], 250);
})();
