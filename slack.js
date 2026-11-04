// Slack skill (app.slack.com). Opens channels and people with the ⌘K quick switcher.
(() => {
  const def = {
    id: 'slack', title: 'Slack', version: '1.0.0', destLabel: 'Channel or person (e.g. #general)', destWord: 'channel or person', open: 'switcher',
    SEL: {
      ready: ['.p-client_workspace', '.p-client', '[data-qa="channel_sidebar"]'],
      login: ['.p-signin_form', 'input[data-qa="login_email"]', 'input[type="email"]'],
      loginText: 'sign in to slack|sign in to your workspace|enter your email',
      switcher: ['[data-qa="jumper_input"] [contenteditable="true"]', 'input[data-qa="jumper_input"]', '[role="dialog"] [role="combobox"]'],
      result: ['[data-qa="jumper_results"] [role="option"]', '[role="dialog"] [role="listbox"] [role="option"]'],
      resultName: ['[data-qa="jumper_entity_name"]', '.c-search_autocomplete__suggestion_text', 'strong'],
      header: ['[data-qa="channel_name"]', '[data-qa="channel_header_title"]', '.p-view_header__channel_title', '.p-view_header__member_name'],
      composer: ['[data-qa="message_input"] [contenteditable="true"]', '.ql-editor[contenteditable="true"]', '[role="textbox"][aria-label^="Message" i]'],
      sendBtn: ['[data-qa="texty_send_button"]', 'button[aria-label="Send now"]'],
    },
  };
  (window.__orbitDefs = window.__orbitDefs || {}).slack = def;
  if (window.__orbitBuild) window.__orbitBuild();
})();
