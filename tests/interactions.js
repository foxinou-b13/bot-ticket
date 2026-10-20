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
    if (!reponse || !String(reponse.content).includes('✅')) throw new Error('réponse: ' + JSON.stringify(reponse));
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
    if (!String(reponse.content).includes('❌')) throw new Error('limite non appliquée');
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
    if (!payload.components || payload.components.length < 5) throw new Error('components v2 incomplets');
    if (!maj || !String(maj.content).includes('Panneau MENU publié')) throw new Error('confirmation absente : ' + JSON.stringify(maj && maj.content));
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

  console.log(`\n${ok} tests d'interaction OK${process.exitCode ? ' — ÉCHEC' : ' ✅'}`);
})();
