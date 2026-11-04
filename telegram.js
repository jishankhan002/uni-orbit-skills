// Telegram Web skill (web.telegram.org/a and /k). Uses the shared chat kit.
(() => {
  const def = {
    id: 'telegram', title: 'Telegram', version: '1.0.0', destLabel: 'Chat, group or channel name', destWord: 'chat', open: 'search',
    SEL: {
      ready: ['#LeftColumn', '.chat-list', '#column-left .chatlist'],
      login: ['#auth-qr-form', '.auth-form', 'canvas.qr-canvas'],
      loginText: 'log in to telegram by qr code|scan from mobile telegram|log in by phone number',
      search: ['#telegram-search-input', '#column-left input.input-search-input', 'input[placeholder="Search"]'],
      result: ['.LeftSearch .ListItem', '.search-section .ListItem', '.chat-list .ListItem', '.search-group a.row', '.chatlist a.row'],
      resultName: ['.fullName', '.title', '.peer-title', '.dialog-title'],
      header: ['.MiddleHeader .fullName', '.MiddleHeader .title', '.chat-info .peer-title', '.sidebar-header .peer-title'],
      composer: ['#editable-message-text', '.input-message-input[contenteditable="true"]', '[contenteditable="true"][aria-label="Message"]'],
      sendBtn: ['button.send', '.btn-send', 'button[aria-label="Send Message"]'],
    },
  };
  (window.__orbitDefs = window.__orbitDefs || {}).telegram = def;
  if (window.__orbitBuild) window.__orbitBuild();
})();
