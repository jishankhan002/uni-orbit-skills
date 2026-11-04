// Instagram skill: direct messages (instagram.com/direct). Photo posts need a file
// picker, which comes in a later phase; this skill sends text DMs.
(() => {
  const def = {
    id: 'instagram', title: 'Instagram', version: '1.0.0', destLabel: 'Username (DM)', destWord: 'account',
    names: { search: 'search box in New message', composer: 'message box' },
    SEL: {
      ready: ['a[href="/direct/inbox/"]', 'a[href*="/direct/"]', 'svg[aria-label="New message"]'],
      login: ['input[name="username"]', 'form#loginForm'],
      loginText: 'log in to instagram|phone number, username, or email',
      newMsg: ['svg[aria-label="New message"]', '[aria-label="New message"]', 'div[role="button"][aria-label*="new message" i]'],
      search: ['input[name="queryBox"]', '[role="dialog"] input[placeholder*="Search" i]', '[role="dialog"] input'],
      result: ['[role="dialog"] [role="button"][tabindex="0"]', '[role="dialog"] label', '[role="dialog"] [role="listitem"]'],
      resultName: ['span[dir="auto"]', 'span'],
      header: ['div[role="main"] header', 'main header', '[role="main"] [role="banner"]'],
      composer: ['div[role="textbox"][aria-label^="Message" i]', '[contenteditable="true"][aria-label*="message" i]', 'textarea[placeholder*="Message" i]'],
      sendBtn: ['div[role="button"][aria-label="Send"]'],
    },
    async openDest(key, dest, h) {
      const A = window.orbitAgent;
      if (!(await h.clickOn(key, 'newMsg', 8000))) throw new Error('could not find "New message" (open your Instagram inbox)');
      await h.typeInto(key, 'search', dest.replace(/^@/, ''));
      const r = await h.waitFor(() => h.result(key, dest.replace(/^@/, '')), 8000, 400);
      if (!r) { await A.press(key, 'Escape'); throw new Error('no account called "' + dest + '"'); }
      await A.clickAt(key, r.x, r.y); await A.sleep(400);
      const b = await h.waitFor(() => h.button(key, ['Chat', 'Next']), 4000);
      if (!b) { await A.press(key, 'Escape'); throw new Error('could not start the chat with ' + dest); }
      await A.clickAt(key, b.x, b.y);
      const want = h.loose(dest);
      const ok = await h.waitFor(async () => (h.loose(await h.text(key, 'header')) || '').includes(want), 10000);
      if (!ok) throw new Error('could not open the chat with ' + dest);
      return dest;
    },
  };
  (window.__orbitDefs = window.__orbitDefs || {}).instagram = def;
  if (window.__orbitBuild) window.__orbitBuild();
})();
