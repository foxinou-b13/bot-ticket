// Test du chemin EXACT : clic sur un type → modal → création du ticket → fermeture
const store = require('../utils/store');
const h = require('../handlers/ticketHandler');
store.charger();

const guild = {
  id: 'g-test',
  name: 'Serveur Test',
  roles: { everyone: { id: 'everyone' } },
  members: { me: { id: 'bot-1' } },
  channels: {
    create: async opts => {
      if (!opts.name || !opts.parent) throw new Error('salon invalide');
      return {
        id: 'c-test',
        send: async () => ({ id: 'm-test', pin: async () => {} }),
      };
    },
  },
};
// Auto-nettoyage : repartir d'un état vierge à chaque exécution
const gTest = store.getGuild('g-test');
for (const channelId of Object.keys((gTest && gTest.open) || {})) store.removeTicket('g-test', channelId);

store.setGuild('g-test', {
  categoryId: 'cat-1',
  staffRoleIds: ['role-1'],
  logChannelId: 'log-1',
  panelChannelId: 'pan-1',
  panelMode: 'menu',
  types: [{ id: 't1', nom: 'Problème', emoji: '🔴', description: null, categoryId: null, staffRoleIds: [] }],
});


// ─── Lecture des réponses en composants v2 (cartes arrondies) ───
function texteDe(p) {
  if (!p) return '';
  if (typeof p === 'string') return p;
  const morceaux = [];
  const voir = c => {
    if (!c) return;
    if (Array.isArray(c)) return c.forEach(voir);
    const j = typeof c.toJSON === 'function' ? c.toJSON() : c;
    if (j.content) morceaux.push(String(j.content));
    if (j.placeholder) morceaux.push(String(j.placeholder));
    if (j.label) morceaux.push(String(j.label));
    if (j.title) morceaux.push(String(j.title));
    if (j.description) morceaux.push(String(j.description));
    if (j.fields) j.fields.forEach(f => morceaux.push(`${f.name} ${f.value}`));
    if (j.options) j.options.forEach(o => morceaux.push(`${o.label || ''} ${o.value || ''}`));
    if (j.components) voir(j.components);
  };
  voir(p.components);
  voir(p.embeds);
  if (p.content) morceaux.push(String(p.content));
  return morceaux.join('\n');
}
function idsDe(p) {
  const ids = [];
  const voir = c => {
    if (!c) return;
    if (Array.isArray(c)) return c.forEach(voir);
    const j = typeof c.toJSON === 'function' ? c.toJSON() : c;
    if (j.custom_id || j.customId) ids.push(j.custom_id || j.customId);
    if (j.components) voir(j.components);
  };
  voir(p && p.components);
  return ids;
}

let ok = 0;
async function test(nom, fn) {
  try {
    await fn();
    ok++;
    console.log('  ✅ ' + nom);
  } catch (e) {
    console.log('  ❌ ' + nom + ' → ' + e.message);
    process.exitCode = 1;
  }
}

(async () => {
  console.log('── Clic sur un type (panneau public) ──');
  let modalVu = null;
  await test('le clic ouvre le formulaire de raison', async () => {
    const inter = {
      customId: 'tkt:type-ouvrir',
      values: ['t1'],
      guild,
      member: { roles: { cache: new Map() } },
      user: { id: 'u1' },
      showModal: m => { modalVu = m; },
    };
    await h.handleSelectMenu(inter);
    if (!modalVu) throw new Error('aucun formulaire ouvert');
  });

  await test('le formulaire crée le ticket', async () => {
    let reponse = null;
    const inter = {
      customId: 'tkt:sujet:t1',
      guild,
      client: { user: { id: 'bot-1' } },
      user: { id: 'u2' },
      fields: { getTextInputValue: () => 'Ma raison' },
      reply: r => { reponse = r; },
    };
    await h.handleModal(inter);
    if (!reponse || !texteDe(reponse).includes('ticket est ouvert')) throw new Error('réponse: ' + texteDe(reponse));
  });

  await test('deuxième ticket du même membre refusé', async () => {
    let reponse = null;
    const inter = {
      customId: 'tkt:sujet:t1',
      guild,
      client: { user: { id: 'bot-1' } },
      user: { id: 'u2' },
      fields: { getTextInputValue: () => 'encore' },
      reply: r => { reponse = r; },
    };
    await h.handleModal(inter);
    if (!texteDe(reponse).includes('❌')) throw new Error('limite non appliquée : ' + texteDe(reponse));
  });

  console.log('── Bouton fermer (raison demandée) ──');
  await test('fermer ouvre le formulaire de raison', async () => {
    let modalVu2 = null;
    store.addTicket('g-test', 'c-ticket', {
      numero: 9, userId: 'u2', sujet: 'x', claimedBy: null, createdAt: Date.now(), staffRoleIds: ['role-1'],
    });
    const inter = {
      customId: 'ticket:fermer',
      guild,
      channel: { id: 'c-ticket' },
      member: { roles: { cache: new Map([['role-1', 1]]) } },
      user: { id: 's1' },
      showModal: m => { modalVu2 = m; },
    };
    await h.handleButton(inter);
    if (!modalVu2) throw new Error('pas de formulaire de raison');
  });

  console.log('── Assistant : choix du salon → envoi du panneau v2 ──');
  await test('le panneau part AVEC le flag IS_COMPONENTS_V2 (32768)', async () => {
    let payload = null;
    const canal = {
      id: 'pan-wiz',
      permissionOverwrites: { edit: async () => {} },
      messages: { fetch: async () => null },
      send: async p => { payload = p; return { id: 'm-wiz' }; },
    };
    const g = {
      id: 'g-test', name: 'Serveur Test',
      roles: { everyone: { id: 'everyone' } },
      members: { me: { id: 'bot-1' } },
      channels: { fetch: async id => (id === 'pan-wiz' ? canal : null) },
    };
    store.setGuild('g-test', { panelChannelId: 'pan-wiz', panelMessageId: null, panelMode: 'menu' });
    let maj = null;
    const inter = {
      customId: 'tkt:panel-channel',
      values: ['pan-wiz'],
      guild: g,
      member: { permissions: { has: () => true }, roles: { cache: new Map() } },
      update: r => { maj = r; },
    };
    await h.handleSelectMenu(inter);
    if (!payload) throw new Error('channel.send jamais appelé');
    if (payload.flags !== 32768) throw new Error('flags absent ou faux : ' + payload.flags);
    const types = payload.components.map(c => (c.toJSON ? c.toJSON() : c).type);
    if (types.join(',') !== '17') throw new Error('tout doit être dans la carte (17) : ' + types.join(','));
    if (!maj || !texteDe(maj).includes('Panneau MENU publié')) throw new Error('confirmation absente : ' + texteDe(maj));
  });

  await test('édition d’un panneau existant : flag v2 + embeds retirés', async () => {
    let payload = null;
    const msg = { id: 'm-old', edit: async p => { payload = p; return msg; } };
    const canal = {
      id: 'pan-edit',
      permissionOverwrites: { edit: async () => {} },
      messages: { fetch: async () => msg },
      send: async () => { throw new Error('ne doit pas créer de doublon'); },
    };
    const g = {
      id: 'g-test', name: 'Serveur Test',
      roles: { everyone: { id: 'everyone' } },
      members: { me: { id: 'bot-1' } },
      channels: { fetch: async id => (id === 'pan-edit' ? canal : null) },
    };
    const channel = await h.envoyerPanel(g, { panelChannelId: 'pan-edit', panelMessageId: 'm-old', panelMode: 'menu', types: [{ id: 't1', nom: 'Problème', emoji: '🔴' }] });
    if (!channel) throw new Error('envoyerPanel a échoué');
    if (payload.flags !== 32768) throw new Error('flags absent sur l’édition : ' + payload.flags);
    if (!Array.isArray(payload.embeds) || payload.embeds.length !== 0) throw new Error('anciens embeds non retirés');
  });

  store.setGuild('g-test', { panelChannelId: 'pan-1', panelMessageId: null });

  console.log('── /ticket panel : sélecteur MENU / BOUTON ──');
  const cmd = require('../commands/ticket');
  function mockGuildPanel(fetchFn) {
    return {
      id: 'g-test', name: 'Serveur Test',
      roles: { everyone: { id: 'everyone' } },
      members: { me: { id: 'bot-1' } },
      channels: { fetch: fetchFn },
    };
  }
  await test('/ticket panel sans option affiche le sélecteur (2 choix)', async () => {
    let rep = null;
    const inter = {
      options: { getSubcommand: () => 'panel', getChannel: () => null, getString: () => null },
      guild: mockGuildPanel(async () => null),
      member: { permissions: { has: () => true } },
      reply: r => { rep = r; },
    };
    await cmd.execute(inter);
    const ids = idsDe(rep);
    if (!ids.includes('tkt:panel-choix')) throw new Error('mauvais custom_id : ' + ids.join(', '));
    const options = texteDe(rep);
    if (!options.includes('MENU') || !options.includes('BOUTON')) throw new Error('options du sélecteur absentes');
  });

  await test('clic « Panneau MENU » → panneau v2 envoyé + confirmation', async () => {
    let payload = null;
    const canal = { id: 'pan-sel', permissionOverwrites: { edit: async () => {} }, messages: { fetch: async () => null }, send: async p => { payload = p; return { id: 'm-sel' }; } };
    store.setGuild('g-test', { panelChannelId: 'pan-sel', panelMessageId: null });
    let maj = null;
    const inter = {
      customId: 'tkt:panel-choix', values: ['menu'],
      guild: mockGuildPanel(async id => (id === 'pan-sel' ? canal : null)),
      member: { permissions: { has: () => true }, roles: { cache: new Map() } },
      update: r => { maj = r; },
    };
    await h.handleSelectMenu(inter);
    if (!payload || payload.flags !== 32768) throw new Error('panneau non envoyé ou sans flag');
    const carte = payload.components[0].toJSON();
    const last = carte.components[carte.components.length - 1];
    if (last.type !== 1 || last.components[0].type !== 3) throw new Error('sélecteur pas en bas de la carte : ' + JSON.stringify(last).slice(0, 120));
    if (!texteDe(maj).includes('MENU publié')) throw new Error('confirmation : ' + texteDe(maj));
  });

  await test('clic « Panneau BOUTON » → panneau bouton envoyé + confirmation', async () => {
    let payload = null;
    const canal = { id: 'pan-sel2', permissionOverwrites: { edit: async () => {} }, messages: { fetch: async () => null }, send: async p => { payload = p; return { id: 'm-sel2' }; } };
    store.setGuild('g-test', { panelChannelId: 'pan-sel2', panelMessageId: null });
    store.setGuild('g-test', { bouton: { ...store.getGuild('g-test').bouton, configure: true, items: [{ id: 'x', label: 'Support', emoji: '🎫', couleur: 'vert', categoryId: null, staffRoleIds: [] }] } });
    let maj = null;
    const inter = {
      customId: 'tkt:panel-choix', values: ['bouton'],
      guild: mockGuildPanel(async id => (id === 'pan-sel2' ? canal : null)),
      member: { permissions: { has: () => true }, roles: { cache: new Map() } },
      update: r => { maj = r; },
    };
    await h.handleSelectMenu(inter);
    if (!payload || !payload.embeds || !payload.embeds.length) throw new Error('panneau non envoyé (embed attendu)');
    const row = payload.components[0].toJSON();
    if (row.type !== 1 || row.components[0].type !== 2) throw new Error('bouton absent : ' + JSON.stringify(row).slice(0, 120));
    if (JSON.stringify(payload).includes('attachment://')) throw new Error('bannière présente dans le panneau bouton');
    if (!texteDe(maj).includes('BOUTON publié')) throw new Error('confirmation : ' + texteDe(maj));
  });

  await test('sans salon configuré → sélecteur de salon puis envoi', async () => {
    let payload = null;
    const canal = { id: 'pan-sel3', permissionOverwrites: { edit: async () => {} }, messages: { fetch: async () => null }, send: async p => { payload = p; return { id: 'm-sel3' }; } };
    store.setGuild('g-test', { panelChannelId: null, panelMessageId: null });
    let maj1 = null;
    await h.handleSelectMenu({
      customId: 'tkt:panel-choix', values: ['menu'],
      guild: mockGuildPanel(async id => (id === 'pan-sel3' ? canal : null)),
      member: { permissions: { has: () => true }, roles: { cache: new Map() } },
      update: r => { maj1 = r; },
    });
    if (!idsDe(maj1).includes('tkt:panel-chan-choix')) throw new Error('sélecteur de salon absent : ' + idsDe(maj1).join(', '));
    let maj2 = null;
    await h.handleSelectMenu({
      customId: 'tkt:panel-chan-choix', values: ['pan-sel3'],
      guild: mockGuildPanel(async id => (id === 'pan-sel3' ? canal : null)),
      member: { permissions: { has: () => true }, roles: { cache: new Map() } },
      update: r => { maj2 = r; },
    });
    if (!payload || payload.flags !== 32768) throw new Error('panneau non envoyé après choix du salon');
    if (!texteDe(maj2).includes('publié')) throw new Error('confirmation : ' + texteDe(maj2));
  });

  store.setGuild('g-test', { panelChannelId: 'pan-1', panelMessageId: null, panelMode: 'menu' });

  console.log(`\n${ok} tests d'interaction OK${process.exitCode ? ' — ÉCHEC' : ' ✅'}`);
})();
