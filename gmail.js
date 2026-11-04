// Gmail skill: sends an email. The first line (or sentence) becomes the subject.
(() => {
  function pCompose(SEL, to, su, body) { // runs in Gmail: open a full-page compose window
    const u = new URL(location.href); u.hash = '';
    [['view', 'cm'], ['fs', '1'], ['tf', '1'], ['to', to], ['su', su], ['body', body]].forEach(([k, v]) => u.searchParams.set(k, v));
    location.assign(u.toString());
    return true;
  }
  function pHasTo(SEL, to) {
    const t = to.toLowerCase();
    if ([...document.querySelectorAll('[email]')].some((e) => (e.getAttribute('email') || '').toLowerCase() === t)) return true;
    return [...document.querySelectorAll('input[name="to"], textarea[name="to"], input[aria-label^="To" i]')].some((e) => e.value.toLowerCase().includes(t));
  }
  const def = {
    id: 'gmail', title: 'Gmail', version: '1.0.0', destLabel: 'Email address', destWord: 'address',
    SEL: {
      ready: ['div[gh="cm"]', 'div[role="navigation"]', 'div[role="button"][data-tooltip^="Send"]'],
      login: ['input[type="email"]', 'input[type="password"]'],
      loginText: 'choose an account|sign in to continue to gmail',
      sendBtn: ['div[role="button"][data-tooltip^="Send"]', 'div[role="button"][aria-label^="Send"]', 'button[aria-label^="Send"]'],
      sentText: ['span.bAq', '[role="alert"]'],
    },
    async post(key, dest, text, h) {
      const A = window.orbitAgent;
      const to = String(dest).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('"' + to + '" is not an email address');
      const body = String(text).trim();
      const first = body.split(/\n|(?<=[.!?])\s/)[0].trim();
      const su = first.length > 70 ? first.slice(0, 67) + '…' : first;
      await h.run(key, pCompose, to, su, body);
      await A.sleep(1500);
      const sb = await h.waitFor(() => h.point(key, 'sendBtn'), 30000, 500);
      if (!sb) throw new Error('Gmail did not open the new email');
      if (!(await h.waitFor(() => h.run(key, pHasTo, to), 5000))) throw new Error('the address did not fill in');
      await A.clickAt(key, sb.x, sb.y);
      const gone = await h.waitFor(async () => !(await h.point(key, 'sendBtn')), 10000, 400);
      if (!gone) throw new Error('the email was written but not sent');
      return { to };
    },
  };
  (window.__orbitDefs = window.__orbitDefs || {}).gmail = def;
  if (window.__orbitBuild) window.__orbitBuild();
})();
