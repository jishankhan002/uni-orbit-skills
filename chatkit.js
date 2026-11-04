// Shared helpers for chat-style skills (Telegram, Slack, Discord, Instagram, Gmail…).
// A skill file only describes its app: where the search box, results, header and
// message box are. This kit does the clicking and typing, always through real input
// (window.orbitAgent), and checks each step before going on, so a message never goes
// to the wrong chat. When an app changes its page, update that skill's SEL lists.
(() => {
  // ---- functions that run INSIDE the app page (read-only) ----
  function pStatus(SEL) {
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const any = (l) => (l || []).some((s) => [...document.querySelectorAll(s)].some(vis));
    if (any(SEL.ready)) return 'ready';
    if (any(SEL.login) || (SEL.loginText && new RegExp(SEL.loginText, 'i').test(document.body ? document.body.innerText.slice(0, 4000) : ''))) return 'login';
    return 'loading';
  }
  function pPoint(SEL, which) {
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    for (const s of SEL[which] || []) {
      const el = [...document.querySelectorAll(s)].find(vis);
      if (el) { el.scrollIntoView({ block: 'nearest' }); const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
    }
    return null;
  }
  function pText(SEL, which) {
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    for (const s of SEL[which] || []) {
      const el = [...document.querySelectorAll(s)].find(vis);
      if (el) return ('value' in el && el.tagName === 'INPUT' ? el.value : el.textContent).replace(/\s+/g, ' ').trim();
    }
    return null;
  }
  function pFocusClear(SEL, which) {
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    for (const s of SEL[which] || []) {
      const el = [...document.querySelectorAll(s)].find(vis);
      if (el) { el.focus(); if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.select(); else document.execCommand('selectAll'); return true; }
    }
    return false;
  }
  // Best search result for `dest`: exact name first, then starts-with, then contains.
  function pResult(SEL, dest) {
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const n = (t) => String(t || '').toLowerCase().replace(/^[#@]+/, '').replace(/\s+/g, ' ').trim();
    const want = n(dest);
    let rows = [];
    for (const s of SEL.result || []) rows.push(...document.querySelectorAll(s));
    rows = rows.filter(vis).filter((r) => !rows.some((o) => o !== r && o.contains(r)));
    const named = rows.map((r) => {
      const t = SEL.resultName ? SEL.resultName.map((s) => r.querySelector(s)).find(Boolean) : null;
      return { r, name: ((t && (t.getAttribute('title') || t.textContent)) || r.textContent || '').replace(/\s+/g, ' ').trim() };
    }).filter((x) => x.name);
    const hit = named.find((x) => n(x.name) === want) || named.find((x) => n(x.name).startsWith(want)) || named.find((x) => n(x.name).includes(want));
    if (!hit) return null;
    hit.r.scrollIntoView({ block: 'nearest' });
    const b = hit.r.getBoundingClientRect();
    return { x: b.left + Math.min(b.width / 2, 160), y: b.top + b.height / 2, name: hit.name };
  }
  // Click a button by its visible text (e.g. "Chat", "Next") inside an optional scope.
  function pButton(SEL, words) {
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const els = [...document.querySelectorAll('button, [role="button"], div[tabindex="0"]')].filter(vis);
    const el = els.find((e) => words.some((w) => e.textContent.replace(/\s+/g, ' ').trim().toLowerCase() === w.toLowerCase() && e.getAttribute('aria-disabled') !== 'true' && !e.disabled));
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }

  const A = () => { if (!window.orbitAgent) throw new Error('the action engine only runs in the Mac app'); return window.orbitAgent; };
  const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
  const loose = (t) => String(t || '').toLowerCase().replace(/^[#@]+/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

  function make(def) {
    const SEL = def.SEL;
    const run = (key, fn, ...args) => A().exec(key, `(${fn.toString()})(${JSON.stringify(SEL)}${args.map((a) => ',' + JSON.stringify(a)).join('')})`);
    const waitFor = async (check, timeout = 8000, every = 250) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) { const v = await check(); if (v) return v; await A().sleep(every); }
      return null;
    };
    const clickOn = async (key, which, timeout = 6000) => {
      const p = await waitFor(() => run(key, pPoint, which), timeout);
      if (!p) return false;
      await A().clickAt(key, p.x, p.y); await A().sleep(200);
      return true;
    };
    const typeInto = async (key, which, text) => {
      if (!(await clickOn(key, which))) throw new Error('could not find the ' + (def.names && def.names[which] || which));
      await run(key, pFocusClear, which);
      await A().type(key, text);
    };

    const h = {
      run, waitFor, clickOn, typeInto, norm, loose,
      point: (key, which) => run(key, pPoint, which),
      text: (key, which) => run(key, pText, which),
      result: (key, dest) => run(key, pResult, dest),
      button: (key, words) => run(key, pButton, words),
      focusClear: (key, which) => run(key, pFocusClear, which),
    };

    const skill = {
      SEL, version: def.version, destLabel: def.destLabel, title: def.title,
      async status(key) { try { return await run(key, pStatus); } catch { return 'loading'; } },
      async waitReady(key, timeout = 30000) {
        const s = await waitFor(async () => { const st = await this.status(key); return st === 'loading' ? null : st; }, timeout, 500);
        return s || 'loading';
      },

      // Go to the chat / channel / person called `dest`. Returns the name as the app shows it.
      async openDest(key, dest) {
        if (def.openDest) return def.openDest.call(this, key, dest, h);
        let name = dest;
        if (def.open === 'switcher') { // Slack / Discord quick switcher (⌘K)
          await A().press(key, 'k', ['meta']); await A().sleep(400);
          if (!(await waitFor(() => run(key, pPoint, 'switcher'), 4000))) throw new Error('could not open the quick switcher');
          await run(key, pFocusClear, 'switcher');
          await A().type(key, dest);
          const r = await waitFor(() => run(key, pResult, dest), 6000, 400);
          if (!r) { await A().press(key, 'Escape'); throw new Error('no ' + def.destWord + ' called "' + dest + '"'); }
          name = r.name; await A().clickAt(key, r.x, r.y);
        } else { // search box, then click the matching result
          await typeInto(key, 'search', dest);
          const r = await waitFor(() => run(key, pResult, dest), 6000, 400);
          if (!r) throw new Error('no ' + def.destWord + ' called "' + dest + '"');
          name = r.name; await A().clickAt(key, r.x, r.y);
        }
        // Never type until the header shows the right chat.
        const ok = await waitFor(async () => { const t = loose(await run(key, pText, 'header')); return t && (t.includes(loose(dest)) || t.includes(loose(name))); }, 8000);
        if (!ok) throw new Error('could not open ' + dest);
        return name;
      },

      // Type and send `text` in the open chat; checks that the message box empties.
      async send(key, text) {
        if (def.send) return def.send.call(this, key, text, h);
        text = norm(text);
        await typeInto(key, 'composer', text); await A().sleep(350);
        const typed = norm(await run(key, pText, 'composer') || '');
        if (!typed.includes(text.slice(0, 40))) throw new Error('the message did not type correctly');
        await A().press(key, 'Enter');
        let sent = await waitFor(async () => !norm(await run(key, pText, 'composer') || ''), 2500);
        if (!sent && SEL.sendBtn) {
          const sb = await run(key, pPoint, 'sendBtn');
          if (sb) { await A().clickAt(key, sb.x, sb.y); sent = await waitFor(async () => !norm(await run(key, pText, 'composer') || ''), 2500); }
        }
        if (!sent) throw new Error('the message was typed but not sent');
      },

      // Used by Scheduled posts and the assistant: post `text` to one destination.
      async post(key, dest, text) {
        const st = await this.waitReady(key, 30000);
        if (st === 'login') throw new Error(def.title + ' is not logged in on this Mac');
        if (st !== 'ready') throw new Error(def.title + ' did not finish loading');
        if (def.post) return def.post.call(this, key, dest, text, h);
        const name = await this.openDest(key, dest);
        await A().sleep(400);
        await this.send(key, text);
        return { to: name };
      },
    };
    return skill;
  }

  window.orbitSkills = window.orbitSkills || {};
  window.orbitSkills.chatkit = { version: '1.0.0', make };
  // Skill files may load before or after this one: build whatever is waiting.
  window.__orbitBuild = () => Object.values(window.__orbitDefs || {}).forEach((d) => { window.orbitSkills[d.id] = make(d); });
  window.__orbitBuild();
})();
