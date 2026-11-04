// Instagram skill.
//  - destination "feed": a photo post on your profile (photo + caption)
//  - any other destination: a text direct message to that username
(() => {
  const def = {
    id: 'instagram', title: 'Instagram', version: '1.1.0', destLabel: 'Username for a DM, or "feed" for a photo post', destWord: 'account',
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
      newPost: ['svg[aria-label="New post"]', '[aria-label="New post"]', 'a[href="#"] svg[aria-label="Create"]', 'svg[aria-label="Create"]'],
      fileInput: ['[role="dialog"] input[type="file"]', 'form[enctype="multipart/form-data"] input[type="file"]', 'input[type="file"][accept*="image"]'],
      caption: ['[role="dialog"] div[aria-label^="Write a caption" i]', '[role="dialog"] [contenteditable="true"]', '[role="dialog"] textarea'],
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
  def.post = async function (key, dest, text, h, opts) {
    const A = window.orbitAgent;
    const feed = /^(feed|post|feed post|my feed|profile)$/i.test(String(dest).trim());
    if (!feed) {
      // a DM sends the text only; photos go to the feed
      const name = await this.openDest(key, dest); await A.sleep(400); await this.send(key, text); return { to: name };
    }
    if (!opts.image) throw new Error('a feed post needs a photo — attach one first');
    // 1) open "Create" → "Post"
    if (!(await h.clickOn(key, 'newPost', 8000))) throw new Error('could not find the Create / New post button');
    await A.sleep(600);
    if (!(await h.point(key, 'fileInput')) && !(await h.run(key, (SEL) => SEL.fileInput.some((s) => document.querySelector(s))))) await h.clickButton(key, ['Post'], 3000);
    // 2) put the photo into the upload box
    const hasInput = await h.waitFor(() => h.run(key, (SEL) => SEL.fileInput.some((s) => document.querySelector(s))), 8000);
    if (!hasInput) throw new Error('the "Create new post" window did not open');
    let ok = false;
    for (const sel of def.SEL.fileInput) { try { await A.attachFile(key, sel, opts.image); ok = true; break; } catch (e) { if (/missing|unknown/.test(e.message)) throw e; } }
    if (!ok) throw new Error('could not add the photo');
    // 3) crop → filters → caption
    for (let i = 0; i < 2; i++) { if (!(await h.clickButton(key, ['Next'], 15000))) throw new Error('the photo did not load in Instagram'); await A.sleep(900); }
    if (text && text.trim()) {
      await h.typeInto(key, 'caption', text.trim()); await A.sleep(400);
      const typed = h.norm(await h.text(key, 'caption') || '');
      if (!typed.includes(h.norm(text).slice(0, 30))) throw new Error('the caption did not type correctly');
    }
    // 4) share and wait for Instagram to confirm
    if (!(await h.clickButton(key, ['Share'], 6000))) throw new Error('could not find Share');
    const done = await h.waitFor(() => h.pageHas(key, 'your post has been shared|post shared'), 60000, 1000);
    if (!done) throw new Error('Instagram did not confirm the post was shared');
    await A.press(key, 'Escape');
    return { to: 'feed', photo: true };
  };
  (window.__orbitDefs = window.__orbitDefs || {}).instagram = def;
  if (window.__orbitBuild) window.__orbitBuild();
})();
