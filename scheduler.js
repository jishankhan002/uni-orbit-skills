// Scheduler skill: posts a scheduled message to its channels one by one.
// The app decides WHEN (it checks every few seconds); this skill decides HOW,
// so the posting logic can improve through over-the-air skill updates.
// Future phase: the same post format will be handed to an online service so
// posts go out even when this Mac is closed.
(() => {
  const scheduler = {
    version: '1.1.0',

    // Skills that can post (have a post() function), e.g. { whatsapp: 'Chat or group name' }
    postingSkills() {
      const out = {};
      Object.entries(window.orbitSkills || {}).forEach(([id, s]) => { if (s && typeof s.post === 'function') out[id] = s.destLabel || 'Destination'; });
      return out;
    },

    // Which channels a post goes to: chosen channels, plus every channel in the chosen workspaces.
    resolve(post, channels, services) {
      const wsOf = (ch) => (services.find((s) => s.id === ch.svcId) || {}).ws;
      const picked = channels.filter((c) => (post.channelIds || []).includes(c.id) || (post.workspaces || []).includes(wsOf(c)));
      return picked.filter((c, i) => picked.findIndex((d) => d.id === c.id) === i);
    },

    // Post to each channel in turn. ctx (from the app):
    //   open(svcId) -> key        open the service and wait until it is loaded
    //   skillId(svcId) -> id      which skill handles this service
    //   sleep(ms)                 stoppable pause (throws 'stopped' after Esc)
    //   progress(channelId, state, detail)
    async run(post, targets, ctx) {
      const results = [];
      for (let i = 0; i < targets.length; i++) {
        const ch = targets[i];
        ctx.progress(ch.id, 'sending');
        try {
          const skill = window.orbitSkills[ctx.skillId(ch.svcId)];
          if (!skill || !skill.post) throw new Error('posting to this app is not available yet');
          const key = await ctx.open(ch.svcId);
          const r = await skill.post(key, ch.dest, post.text, post.image ? { image: post.image.id } : {});
          results.push({ id: ch.id, ok: true, to: ((r && r.to) || ch.dest) + (post.image && !(r && r.photo) ? ' (text only)' : '') });
          ctx.progress(ch.id, 'sent');
        } catch (e) {
          if (e.message === 'stopped') { results.push({ id: ch.id, ok: false, err: 'stopped' }); throw Object.assign(e, { results }); }
          results.push({ id: ch.id, ok: false, err: e.message });
          ctx.progress(ch.id, 'failed', e.message);
        }
        if (i < targets.length - 1) await ctx.sleep(3000 + Math.random() * 3000); // one by one, like a person
      }
      return results;
    },

    // Next time for a repeating post, or null.
    next(post) {
      const day = 864e5;
      if (post.repeat === 'daily') return post.when + day;
      if (post.repeat === 'weekly') return post.when + 7 * day;
      return null;
    },
  };
  window.orbitSkills = Object.assign(window.orbitSkills || {}, { scheduler });
})();
