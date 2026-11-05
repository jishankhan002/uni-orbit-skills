// Teach mode: record a task you do once inside an app, then replay it.
// Steps are saved as descriptions of what you clicked (its label, placeholder, role…),
// not screen positions, so they still work when the window size changes. If a site
// changes and a step's target is gone, `repair` (the local AI) can pick the new one.
// Password fields are never recorded.
(() => {
  // ---- runs INSIDE the app page: the recorder ----
  const RECORDER = `(() => {
    if (window.__orbitRec) return 'on';
    const R = window.__orbitRec = { steps: [], pending: null, secret: false };
    const clean = (t, n) => String(t || '').replace(/\\s+/g, ' ').trim().slice(0, n || 80);
    const goodId = (id) => id && id.length < 40 && !/\\d{3,}|[:_]r[0-9a-z]+:?$|^[a-f0-9-]{16,}$/i.test(id);
    const INTER = 'button,a,input,textarea,select,label,[role=button],[role=link],[role=option],[role=listitem],[role=row],[role=gridcell],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=textbox],[role=combobox],[contenteditable=""],[contenteditable=true],[tabindex]';
    const isField = (el) => el.matches('input,textarea,[contenteditable=""],[contenteditable=true],[role=textbox]');
    const desc = (el) => {
      const b = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '', aria: clean(el.getAttribute('aria-label')),
        text: isField(el) ? '' : clean(el.innerText || el.value), ph: clean(el.getAttribute('placeholder') || el.getAttribute('aria-placeholder') || el.getAttribute('data-placeholder')),
        title: clean(el.getAttribute('title')), tid: el.getAttribute('data-testid') || el.getAttribute('data-qa') || el.getAttribute('data-test-id') || '',
        name: el.getAttribute('name') || '', id: goodId(el.id) ? el.id : '', href: el.tagName === 'A' ? (el.getAttribute('href') || '').split('?')[0].slice(0, 120) : '',
        x: +((b.left + b.width / 2) / innerWidth).toFixed(3), y: +((b.top + b.height / 2) / innerHeight).toFixed(3) };
    };
    const target = (e) => { const t = e.composedPath ? e.composedPath()[0] : e.target; return (t && t.closest && t.closest(INTER)) || t; };
    const flush = () => {
      const p = R.pending; R.pending = null;
      if (!p) return;
      const v = 'value' in p.el && p.el.tagName !== 'DIV' ? p.el.value : p.el.innerText;
      R.steps.push({ type: 'type', d: p.d, value: clean(v, 2000) });
    };
    const onDown = (e) => {
      if (e.button !== 0) return;
      const el = target(e); if (!el || !el.getBoundingClientRect) return;
      if (R.pending && R.pending.el === el) return; // clicking the box you are typing in
      flush(); R.steps.push({ type: 'click', d: desc(el) });
    };
    const onInput = (e) => {
      const el = target(e); if (!el) return;
      if (el.type === 'password' || /password/i.test(el.autocomplete || '')) { R.secret = true; return; }
      if (R.pending && R.pending.el !== el) flush();
      if (!R.pending) R.pending = { el, d: desc(el) };
    };
    const onKey = (e) => {
      const named = ['Enter', 'Escape', 'Tab'].includes(e.key), combo = (e.metaKey || e.ctrlKey) && e.key.length === 1;
      if (!named && !combo) return;
      if (e.target && e.target.type === 'password') return;
      flush();
      R.steps.push({ type: 'key', key: e.key, mods: [e.metaKey && 'meta', e.ctrlKey && 'control', e.shiftKey && 'shift', e.altKey && 'alt'].filter(Boolean) });
    };
    addEventListener('pointerdown', onDown, true); addEventListener('input', onInput, true); addEventListener('keydown', onKey, true);
    R.take = () => { const s = R.steps; R.steps = []; return { steps: s, secret: R.secret }; };
    R.stop = () => { flush(); removeEventListener('pointerdown', onDown, true); removeEventListener('input', onInput, true); removeEventListener('keydown', onKey, true); const out = R.take(); delete window.__orbitRec; return out; };
    return 'started';
  })()`;

  // ---- runs INSIDE the app page: find the element a step describes ----
  function pFind(d, want) {
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.bottom > 0 && b.right > 0 && b.top < innerHeight && b.left < innerWidth; };
    const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const low = (t) => clean(t).toLowerCase();
    const loose = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}@.]+/gu, ' ').trim();
    const INTER = 'button,a,input,textarea,select,label,[role=button],[role=link],[role=option],[role=listitem],[role=row],[role=gridcell],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=textbox],[role=combobox],[contenteditable=""],[contenteditable=true],[tabindex]';
    const isField = (el) => el.matches('input,textarea,[contenteditable=""],[contenteditable=true],[role=textbox]');
    let els = [...document.querySelectorAll(INTER)];
    if (d.tag && !els.some((e) => e.tagName.toLowerCase() === d.tag)) els = els.concat([...document.querySelectorAll(d.tag)].slice(0, 300));
    let best = null, second = -1e9;
    for (const el of els) {
      if (!vis(el)) continue;
      const text = isField(el) ? '' : clean(el.innerText || el.value), aria = clean(el.getAttribute('aria-label')), title = clean(el.getAttribute('title'));
      if (want) { const w = loose(want); if (!w || ![text, aria, title].some((t) => loose(t).includes(w))) continue; }
      let s = 0;
      const tid = el.getAttribute('data-testid') || el.getAttribute('data-qa') || el.getAttribute('data-test-id') || '';
      if (d.tid && tid === d.tid) s += 6;
      if (d.id && el.id === d.id) s += 6;
      if (d.aria && low(aria) === low(d.aria)) s += 5;
      if (!want && d.text) { if (low(text) === low(d.text)) s += 4; else if (d.text.length > 3 && low(text).includes(low(d.text))) s += 2; }
      if (want) s += 4;
      const ph = clean(el.getAttribute('placeholder') || el.getAttribute('aria-placeholder') || el.getAttribute('data-placeholder'));
      if (d.ph && low(ph) === low(d.ph)) s += 4;
      if (d.title && low(title) === low(d.title)) s += 3;
      if (d.name && el.getAttribute('name') === d.name) s += 3;
      if (d.href && el.tagName === 'A' && (el.getAttribute('href') || '').split('?')[0].slice(0, 120) === d.href) s += 3;
      if (s === 0) continue; // nothing in common but the tag: never guess
      if (d.role && el.getAttribute('role') === d.role) s += 1;
      if (el.tagName.toLowerCase() === d.tag) s += 1;
      const b = el.getBoundingClientRect();
      s -= 3 * Math.hypot((b.left + b.width / 2) / innerWidth - d.x, (b.top + b.height / 2) / innerHeight - d.y);
      if (el.contains(document.activeElement) && isField(el)) s += 0.2;
      if (!best || s > best.s) { if (best) second = best.s; best = { s, el }; } else if (s > second) second = s;
    }
    if (!best || best.s < 3.5) return null;
    best.el.scrollIntoView({ block: 'nearest' });
    const b = best.el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, score: +best.s.toFixed(2), close: best.s - second < 0.5 };
  }
  // Everything clickable on the page, for the AI to choose from when a step breaks.
  function pCands() {
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.top < innerHeight && b.left < innerWidth && b.bottom > 0; };
    const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const els = [...document.querySelectorAll('button,a,input,textarea,[role=button],[role=link],[role=option],[role=listitem],[role=row],[role=tab],[role=menuitem],[role=textbox],[contenteditable=true]')].filter(vis);
    const out = [];
    for (const el of els) {
      const label = [clean(el.getAttribute('aria-label')), clean(el.innerText), clean(el.getAttribute('placeholder')), clean(el.getAttribute('title'))].filter(Boolean)[0];
      if (!label) continue;
      const b = el.getBoundingClientRect();
      out.push({ label, kind: el.getAttribute('role') || el.tagName.toLowerCase(), x: b.left + b.width / 2, y: b.top + b.height / 2 });
      if (out.length >= 80) break;
    }
    return out;
  }
  // Describe the element at a point (to save the repaired step).
  function pDescAt(x, y) {
    const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const INTER = 'button,a,input,textarea,select,label,[role=button],[role=link],[role=option],[role=listitem],[role=row],[role=gridcell],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=textbox],[role=combobox],[contenteditable=""],[contenteditable=true],[tabindex]';
    const t = document.elementFromPoint(x, y); if (!t) return null;
    const el = t.closest(INTER) || t, field = el.matches('input,textarea,[contenteditable=""],[contenteditable=true],[role=textbox]');
    return { tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '', aria: clean(el.getAttribute('aria-label')), text: field ? '' : clean(el.innerText || el.value),
      ph: clean(el.getAttribute('placeholder') || el.getAttribute('aria-placeholder') || el.getAttribute('data-placeholder')), title: clean(el.getAttribute('title')),
      tid: el.getAttribute('data-testid') || el.getAttribute('data-qa') || '', name: el.getAttribute('name') || '', id: '', href: el.tagName === 'A' ? (el.getAttribute('href') || '').split('?')[0].slice(0, 120) : '',
      x: +(x / innerWidth).toFixed(3), y: +(y / innerHeight).toFixed(3) };
  }
  function pClearFocused() {
    const el = document.activeElement; if (!el) return false;
    if ('value' in el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) { el.select(); return true; }
    if (el.isContentEditable) { document.execCommand('selectAll'); return true; }
    return false;
  }

  const A = () => { if (!window.orbitAgent) throw new Error('teach mode only runs in the Mac app'); return window.orbitAgent; };
  const call = (key, fn, ...args) => A().exec(key, `(${fn.toString()})(${args.map((a) => JSON.stringify(a)).join(',')})`);
  const waitFor = async (check, timeout, every = 300) => { const end = Date.now() + timeout; for (;;) { const v = await check(); if (v || Date.now() > end) return v; await A().sleep(every); } };

  // A short human description of a step, e.g. Click "New chat" / Type "Mom" in "Search".
  const what = (d) => d.aria || d.text || d.ph || d.title || d.name || d.tid || d.role || d.tag;
  function describe(st) {
    if (st.type === 'click') return 'Click "' + what(st.d) + '"';
    if (st.type === 'type') return 'Type "' + st.value + '" in "' + what(st.d) + '"';
    if (st.type === 'key') return 'Press ' + [...(st.mods || []).map((m) => ({ meta: '⌘', control: '⌃', shift: '⇧', alt: '⌥' }[m] || m)), st.key.length === 1 ? st.key.toUpperCase() : st.key].join('');
    return st.type;
  }

  // Tidy a raw recording: drop repeated clicks on the same thing and clicks straight into a field you then type in.
  function tidy(steps) {
    const out = [];
    for (const st of steps) {
      const prev = out[out.length - 1];
      if (prev && st.type === 'click' && prev.type === 'click' && JSON.stringify(prev.d) === JSON.stringify(st.d)) continue;
      if (prev && st.type === 'type' && prev.type === 'click' && what(prev.d) === what(st.d)) out.pop();
      out.push(st);
    }
    // A click on a search result that shows text you typed earlier follows that text when you change it.
    out.forEach((st, i) => {
      if (st.type !== 'click') return;
      for (let j = i - 1; j >= 0; j--) {
        const t = out[j];
        if (t.type === 'type' && t.value.length >= 2 && [st.d.text, st.d.aria, st.d.title].some((x) => String(x || '').toLowerCase().includes(t.value.toLowerCase()))) { st.dep = j; break; }
      }
    });
    return out;
  }

  const teach = {
    version: '1.0.0', describe, tidy,
    async start(key) { return A().exec(key, RECORDER); },
    // Collect new steps; re-arms the recorder after the page reloads.
    async pull(key) {
      const r = await A().exec(key, 'window.__orbitRec ? window.__orbitRec.take() : null').catch(() => null);
      if (r) return r;
      await A().exec(key, RECORDER).catch(() => {});
      return { steps: [], secret: false };
    },
    async stop(key) { return (await A().exec(key, 'window.__orbitRec ? window.__orbitRec.stop() : { steps: [], secret: false }').catch(() => null)) || { steps: [], secret: false }; },

    // Replay. values[i] replaces the text typed in step i. Returns { repaired: [{ i, d }] }.
    // opts: { onStep(i), sleep(ms) (stoppable), repair(step, candidates) -> index or -1 }
    async run(key, steps, values = {}, opts = {}) {
      const sleep = opts.sleep || A().sleep, repaired = [];
      const locate = async (st, i) => {
        const want = st.dep != null && values[st.dep] != null ? values[st.dep] : null;
        let p = await waitFor(() => call(key, pFind, st.d, want), 8000, 350);
        if (p) return p;
        if (want) throw new Error('step ' + (i + 1) + ': nothing on screen matches "' + want + '"');
        if (!opts.repair) throw new Error('step ' + (i + 1) + ': could not find "' + what(st.d) + '" (the page may have changed)');
        const cands = await call(key, pCands);
        const k = await opts.repair(st, cands);
        if (!(k >= 0 && k < cands.length)) throw new Error('step ' + (i + 1) + ': could not find "' + what(st.d) + '", and the AI found no replacement');
        const d = await call(key, pDescAt, cands[k].x, cands[k].y);
        if (d) repaired.push({ i, d, was: what(st.d), now: cands[k].label });
        return cands[k];
      };
      for (let i = 0; i < steps.length; i++) {
        const st = steps[i];
        if (opts.onStep) opts.onStep(i);
        if (st.type === 'click') { const p = await locate(st, i); await A().clickAt(key, p.x, p.y); }
        else if (st.type === 'type') {
          const p = await locate(st, i); await A().clickAt(key, p.x, p.y); await sleep(150);
          await call(key, pClearFocused);
          const v = values[i] != null ? String(values[i]) : st.value;
          if (v) await A().type(key, v);
        } else if (st.type === 'key') await A().press(key, st.key.length === 1 ? st.key.toLowerCase() : st.key, st.mods || []);
        await sleep(i < steps.length - 1 ? 700 : 300);
      }
      return { repaired };
    },
  };

  window.orbitSkills = window.orbitSkills || {};
  window.orbitSkills.teach = teach;
})();
