// WhatsApp Web skills for the UNI ORBIT AI assistant.
// The page functions below only READ WhatsApp's page (names, positions, text);
// every click and keystroke goes through window.orbitAgent as real input.
// When WhatsApp changes its page, update the selectors in SEL.
(() => {
  const SEL = {
    chatPane: ['#pane-side', '[aria-label="Chat list"]', '[aria-label*="chat list" i]'],
    row: '[role="listitem"], [role="row"]',
    rowName: 'span[title]',
    search: ['#side [contenteditable="true"]', '#side input[type="text"]', 'input[aria-label*="search" i]', '[contenteditable="true"][aria-label*="search" i]'],
    header: ['#main header'],
    composer: ['#main footer [contenteditable="true"][role="textbox"]', '#main footer [contenteditable="true"]', '[contenteditable="true"][aria-label*="type a message" i]'],
    sendBtn: ['#main footer button[aria-label="Send"]', '#main footer [data-icon="send"]', '#main footer [data-icon*="send"]', 'button[aria-label="Send"]'],
    qr: ['canvas[aria-label*="qr" i]', 'div[data-ref] canvas'],
  };

  // ---- functions that run INSIDE the WhatsApp page (read-only) ----
  function pStatus(SEL) {
    const q = (l) => l.map((s) => document.querySelector(s)).find(Boolean);
    if (q(SEL.chatPane)) return 'ready';
    if (q(SEL.qr) || /scan to log in|log in with phone number|link with phone/i.test(document.body.innerText)) return 'login';
    return 'loading';
  }
  function pScroller(SEL) {
    const q = (l) => l.map((s) => document.querySelector(s)).find(Boolean);
    let el = q(SEL.chatPane);
    while (el && el !== document.body && !(el.scrollHeight > el.clientHeight + 5 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
    return el && el !== document.body ? el : q(SEL.chatPane);
  }
  function pRows(SEL) {
    const q = (l) => l.map((s) => document.querySelector(s)).find(Boolean);
    const pane = q(SEL.chatPane);
    if (!pane) return null;
    const box = pane.getBoundingClientRect();
    let rows = [...pane.querySelectorAll(SEL.row)];
    rows = rows.filter((r) => !rows.some((o) => o !== r && o.contains(r))); // outermost rows only
    const out = [];
    for (const r of rows) {
      const t = r.querySelector(SEL.rowName);
      const name = t && (t.getAttribute('title') || '').trim();
      const b = r.getBoundingClientRect();
      if (!name || b.height < 10) continue;
      if (b.bottom <= box.top || b.top >= box.bottom) continue; // not on screen
      out.push({ name, top: b.top });
    }
    out.sort((a, b) => a.top - b.top);
    // the scroll helper is defined separately; report whether more rows exist below
    let sc = pane; while (sc && sc !== document.body && !(sc.scrollHeight > sc.clientHeight + 5)) sc = sc.parentElement;
    const more = !!sc && sc !== document.body && sc.scrollTop + sc.clientHeight < sc.scrollHeight - 5;
    return { names: out.map((o) => o.name), more };
  }
  function pScroll(SEL, to) {
    const q = (l) => l.map((s) => document.querySelector(s)).find(Boolean);
    let el = q(SEL.chatPane);
    while (el && el !== document.body && !(el.scrollHeight > el.clientHeight + 5)) el = el.parentElement;
    if (!el || el === document.body) return false;
    if (to === 'top') el.scrollTop = 0; else el.scrollTop += el.clientHeight * 0.8;
    return true;
  }
  function pRowPoint(SEL, name) {
    const q = (l) => l.map((s) => document.querySelector(s)).find(Boolean);
    const pane = q(SEL.chatPane) || document;
    const t = [...pane.querySelectorAll(SEL.rowName)].find((e) => (e.getAttribute('title') || '').trim() === name);
    if (!t) return null;
    const row = t.closest('[role="listitem"], [role="row"]') || t;
    row.scrollIntoView({ block: 'center' });
    const b = row.getBoundingClientRect();
    return { x: b.left + Math.min(b.width / 2, 160), y: b.top + b.height / 2 };
  }
  function pPoint(SEL, which) {
    const el = SEL[which].map((s) => document.querySelector(s)).find(Boolean);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }
  function pHeader(SEL) {
    const h = SEL.header.map((s) => document.querySelector(s)).find(Boolean);
    return h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
  }
  function pFocusClear(SEL, which) {
    const el = SEL[which].map((s) => document.querySelector(s)).find(Boolean);
    if (!el) return false;
    el.focus();
    if ('value' in el && el.tagName === 'INPUT') { el.select(); } else { document.execCommand('selectAll'); }
    return true;
  }
  function pComposerText(SEL) {
    const el = SEL.composer.map((s) => document.querySelector(s)).find(Boolean);
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  }

  // ---- runner ----
  const A = () => { if (!window.orbitAgent) throw new Error('the action engine only runs in the Mac app'); return window.orbitAgent; };
  const run = (key, fn, ...args) => A().exec(key, `(${fn.toString()})(${JSON.stringify(SEL)}${args.map((a) => ',' + JSON.stringify(a)).join('')})`);
  const norm = (t) => String(t).replace(/\s+/g, ' ').trim();

  async function waitFor(check, timeout = 8000, every = 250) {
    const end = Date.now() + timeout;
    while (Date.now() < end) { const v = await check(); if (v) return v; await A().sleep(every); }
    return null;
  }

  const whatsapp = {
    SEL,
    async status(key) { try { return await run(key, pStatus); } catch { return 'loading'; } },

    // Wait until WhatsApp has loaded and you are logged in.
    async waitReady(key, timeout = 30000) {
      const s = await waitFor(async () => { const st = await this.status(key); return st === 'loading' ? null : st; }, timeout, 500);
      return s || 'loading';
    },

    // Names of the first n chats, top to bottom (pinned chats first, like on screen).
    async topChats(key, n) {
      const names = [];
      await run(key, pScroll, 'top'); await A().sleep(400);
      for (let i = 0; i < 12 && names.length < n; i++) {
        const r = await run(key, pRows);
        if (!r) throw new Error('could not find the WhatsApp chat list');
        r.names.forEach((x) => { if (!names.includes(x)) names.push(x); });
        if (names.length >= n || !r.more) break;
        await run(key, pScroll, 'down'); await A().sleep(600);
      }
      await run(key, pScroll, 'top');
      return names.slice(0, n);
    },

    // Open a chat by its exact name (from the list, or via search).
    async openChat(key, name) {
      let pt = await run(key, pRowPoint, name);
      if (!pt) {
        const sp = await run(key, pPoint, 'search');
        if (!sp) throw new Error('could not find the WhatsApp search box');
        await A().clickAt(key, sp.x, sp.y); await A().sleep(200);
        await run(key, pFocusClear, 'search');
        await A().type(key, name);
        pt = await waitFor(() => run(key, pRowPoint, name), 6000, 400);
        if (!pt) throw new Error('no chat named "' + name + '"');
      }
      await A().clickAt(key, pt.x, pt.y);
      const ok = await waitFor(async () => norm(await run(key, pHeader)).includes(norm(name)), 8000);
      if (!ok) throw new Error('could not open the chat with ' + name);
    },

    // Chats whose name contains q (uses WhatsApp search; clears it afterwards).
    async findChats(key, q) {
      const sp = await run(key, pPoint, 'search');
      if (!sp) throw new Error('could not find the WhatsApp search box');
      await A().clickAt(key, sp.x, sp.y); await A().sleep(200);
      await run(key, pFocusClear, 'search');
      await A().type(key, q); await A().sleep(1600);
      const r = await run(key, pRows);
      const ql = norm(q).toLowerCase();
      const names = [...new Set((r ? r.names : []).filter((n) => n.toLowerCase().includes(ql)))];
      names.sort((a, b) => (b.toLowerCase() === ql) - (a.toLowerCase() === ql));
      await run(key, pFocusClear, 'search'); await A().press(key, 'Backspace'); await A().sleep(300);
      return names;
    },

    // Type and send a message in the open chat; checks that it really went.
    async send(key, text) {
      text = norm(text);
      const cp = await waitFor(() => run(key, pPoint, 'composer'), 8000);
      if (!cp) throw new Error('could not find the message box');
      await A().clickAt(key, cp.x, cp.y); await A().sleep(150);
      await run(key, pFocusClear, 'composer');
      await A().type(key, text); await A().sleep(350);
      const typed = norm(await run(key, pComposerText) || '');
      if (!typed.includes(text)) throw new Error('the message did not type correctly');
      await A().press(key, 'Enter');
      let sent = await waitFor(async () => (await run(key, pComposerText)) === '', 2500);
      if (!sent) {
        const sb = await run(key, pPoint, 'sendBtn');
        if (sb) { await A().clickAt(key, sb.x, sb.y); sent = await waitFor(async () => (await run(key, pComposerText)) === '', 2500); }
      }
      if (!sent) throw new Error('the message was typed but not sent');
    },
  };

  // Used by the scheduler: post `text` to one destination (a chat or group name).
  whatsapp.version = '1.1.0';
  whatsapp.destLabel = 'Chat or group name';
  whatsapp.post = async function (key, dest, text) {
    const st = await this.waitReady(key, 30000);
    if (st === 'login') throw new Error('WhatsApp is not linked on this Mac');
    if (st !== 'ready') throw new Error('WhatsApp did not finish loading');
    let name = dest;
    const exact = await run(key, pRowPoint, dest);
    if (!exact) { const found = await this.findChats(key, dest); if (!found.length) throw new Error('no chat named "' + dest + '"'); name = found[0]; }
    await this.openChat(key, name);
    await A().sleep(400);
    await this.send(key, text);
    return { to: name };
  };

  window.orbitSkills = Object.assign(window.orbitSkills || {}, { whatsapp });
})();
