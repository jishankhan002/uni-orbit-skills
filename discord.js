// Discord skill (discord.com/app). Opens channels and DMs with the ⌘K quick switcher.
(() => {
  const def = {
    id: 'discord', title: 'Discord', version: '1.0.0', destLabel: 'Channel, server channel or friend', destWord: 'channel or friend', open: 'switcher',
    SEL: {
      ready: ['nav[aria-label="Servers sidebar"]', 'nav[aria-label*="servers" i]', '[data-list-id="guildsnav"]'],
      login: ['form[class*="authBox"]', 'input[name="email"]'],
      loginText: 'welcome back!|log in with qr code|we\'re so excited to see you again',
      switcher: ['[aria-label="Quick switcher"] input', 'input[aria-label*="quick switcher" i]', '[class*="quickswitcher"] input'],
      result: ['[aria-label="Quick switcher"] [role="option"]', '[class*="quickswitcher"] [role="option"]'],
      resultName: ['[class*="name"]', '[class*="match"]'],
      header: ['section[aria-label="Channel header"] h1', '[class*="titleWrapper"] h1', 'h1[class*="title"]', 'section[class*="title"] [class*="title"]'],
      composer: ['[role="textbox"][data-slate-editor="true"]', 'div[contenteditable="true"][aria-label^="Message" i]'],
      sendBtn: [],
    },
  };
  (window.__orbitDefs = window.__orbitDefs || {}).discord = def;
  if (window.__orbitBuild) window.__orbitBuild();
})();
