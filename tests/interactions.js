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

  console.log(`\n${ok} tests d'interaction OK${process.exitCode ? ' — ÉCHEC' : ' ✅'}`);
})();
