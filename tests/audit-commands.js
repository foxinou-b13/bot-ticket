/**
 * tests/audit-commands.js — AUDIT COMPLET : chaque commande, chaque bouton,
 * chaque menu, chaque formulaire doit TOUJOURS produire une réponse
 * (pas de silence → pas de « l'application ne répond pas »).
 */
const store = require('../utils/store');
const h = require('../handlers/ticketHandler');
const cmdTicket = require('../commands/ticket');
const cmdSetup = require('../commands/setup');
store.charger();

const G = 'g-audit';
const g0 = store.getGuild(G);
for (const c of Object.keys((g0 && g0.open) || {})) store.removeTicket(G, c);
store.setGuild(G, {
  categoryId: 'cat-a',
  logChannelId: 'log-a',
  panelChannelId: 'pan-a',
  panelMessageId: null,
  staffRoleIds: ['role-staff'],
  panelMode: 'menu',
  panel: { titre: null, description: null, selecteur: null, image: null },
  types: [{ id: 't1', nom: 'Bug', emoji: '🔴', description: null, categoryId: null, staffRoleIds: ['role-staff'] }],
});
store.addTicket(G, 'c-tick', { numero: 7, userId: 'u-owner', sujet: 'S', typeId: 't1', typeNom: 'Bug', typeEmoji: '🔴', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now(), messageId: 'm-tick' });

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

// ─── Mocks ───
function canalMock(id, cap) {
  const msgTicket = { id: 'm-tick', edit: async p => { cap.edit = p; return msgTicket; } };
  return {
    id,
    send: async p => { cap.send = p; return { id: 'm-' + id, pin: async () => {} }; },
    delete: async () => { cap.delete = true; },
    permissionOverwrites: { edit: async () => {}, delete: async () => {} },
    messages: {
      fetch: async arg => {
        if (arg && arg.limit) return new Map([['a', { createdTimestamp: Date.now(), author: { tag: 'X#1' }, content: 'bonjour' }]]);
        return msgTicket;
      },
    },
  };
}
function guildMock(cap, opts = {}) {
  return {
    id: G,
    name: 'Serveur Audit',
    roles: { everyone: { id: 'every' } },
    members: { me: { id: 'bot-1' } },
    channels: {
      fetch: async id => {
        if (opts.absent && opts.absent.includes(id)) return null;
        return canalMock(id, cap);
      },
      create: async o => canalMock('c-new-' + o.name, cap),
    },
  };
}
function interMock(cap, over = {}) {
  const base = {
    guild: over.guild || guildMock(cap),
    member: over.member || { permissions: { has: () => true }, roles: { cache: new Map([['role-staff', 1]]) } },
    user: { id: 'u-admin' },
    channel: over.channel || canalMock('c-tick', cap),
    client: { user: { id: 'bot-1' }, users: { fetch: async () => ({ send: async () => {} }) } },
    reply: async r => { cap.repondu = 'reply'; cap.last = r; return r; },
    update: async r => { cap.repondu = 'update'; cap.last = r; return r; },
    editReply: async r => { cap.repondu = 'editReply'; cap.last = r; return r; },
    deferReply: async () => { cap.repondu = 'defer'; },
    followUp: async r => { cap.repondu = 'followUp'; return r; },
    showModal: async m => { cap.repondu = 'modal'; cap.last = m; return m; },
  };
  return Object.assign(base, over);
}
function optionsMock(sub, extras = {}) {
  return Object.assign({
    getSubcommand: () => sub,
    getSubcommandGroup: () => extras.groupe || null,
    getChannel: () => extras.salon || null,
    getString: n => (extras.strings || {})[n] || null,
    getRole: () => extras.role || null,
    getMember: () => extras.membre || null,
    getAttachment: () => null,
  });
}
function champsMock(vals) {
  return { getTextInputValue: n => vals[n] || '' };
}
function aRepondu(cap, nom) {
  if (!cap.repondu) throw new Error('AUCUNE RÉPONSE (' + nom + ')');
}

(async () => {
  console.log('── Commandes /ticket ──');
  await test('/ticket setup (avec rôle) → confirme tout', async () => {
    const cap = {};
    await cmdTicket.execute(interMock(cap, { options: optionsMock('setup', { role: { id: 'role-staff' } }) }));
    aRepondu(cap, 'setup');
    if (cap.repondu !== 'editReply' && cap.repondu !== 'reply') throw new Error('réponse : ' + cap.repondu);
  });
  await test('/ticket setup (sans rôle) → demande les rôles', async () => {
    const cap = {};
    await cmdTicket.execute(interMock(cap, { options: optionsMock('setup') }));
    aRepondu(cap, 'setup sans rôle');
    if (!cap.last || !cap.last.components || !cap.last.components.length) throw new Error('menu des rôles absent');
  });
  await test('/ticket panel (sans option) → sélecteur MENU/BOUTON', async () => {
    const cap = {};
    await cmdTicket.execute(interMock(cap, { options: optionsMock('panel') }));
    aRepondu(cap, 'panel');
    if (!cap.last.components || cap.last.components[0].components[0].toJSON().custom_id !== 'tkt:panel-choix') throw new Error('sélecteur absent');
  });
  await test('/ticket panel (titre perso) → envoi direct', async () => {
    const cap = {};
    await cmdTicket.execute(interMock(cap, { options: optionsMock('panel', { strings: { titre: 'T' } }) }));
    aRepondu(cap, 'panel titre');
  });
  await test('/ticket config → récapitulatif', async () => {
    const cap = {};
    await cmdTicket.execute(interMock(cap, { options: optionsMock('config') }));
    aRepondu(cap, 'config');
    if (!String(cap.last.content).includes('Configuration des tickets')) throw new Error('contenu config');
  });
  await test('/ticket claim hors ticket → erreur propre', async () => {
    const cap = {};
    await cmdTicket.execute(interMock(cap, { channel: canalMock('c-pas-ticket', cap), options: optionsMock('claim') }));
    aRepondu(cap, 'claim hors ticket');
    if (!String(cap.last.content).includes('❌')) throw new Error('pas de message d\'erreur');
  });
  await test('/ticket claim dans un ticket (staff) → pris en charge', async () => {
    const cap = {};
    await cmdTicket.execute(interMock(cap, { options: optionsMock('claim') }));
    aRepondu(cap, 'claim');
    if (!String(cap.last).includes('pris en charge') && !String(cap.last.content || cap.last).includes('pris en charge')) throw new Error('confirmation claim');
  });
  await test('/ticket claim non staff → refus', async () => {
    const cap = {};
    store.updateTicket(G, 'c-tick', { claimedBy: null });
    await cmdTicket.execute(interMock(cap, { member: { permissions: { has: () => true }, roles: { cache: new Map() } }, options: optionsMock('claim') }));
    aRepondu(cap, 'claim non staff');
    if (!String(cap.last.content).includes('❌')) throw new Error('refus absent');
  });
  await test('/ticket add (membre) → ajouté', async () => {
    const cap = {};
    await cmdTicket.execute(interMock(cap, { options: optionsMock('add', { membre: { id: 'u-add' } }) }));
    aRepondu(cap, 'add');
    if (!String(cap.last.content || cap.last).includes('ajouté')) throw new Error('confirmation add');
  });
  await test('/ticket add sans membre → erreur propre', async () => {
    const cap = {};
    await cmdTicket.execute(interMock(cap, { options: optionsMock('add') }));
    aRepondu(cap, 'add sans membre');
  });
  await test('/ticket remove → retiré', async () => {
    const cap = {};
    await cmdTicket.execute(interMock(cap, { options: optionsMock('remove', { membre: { id: 'u-add' } }) }));
    aRepondu(cap, 'remove');
  });
  await test('/ticket close sans raison → formulaire de raison', async () => {
    const cap = {};
    await cmdTicket.execute(interMock(cap, { options: optionsMock('close') }));
    aRepondu(cap, 'close');
    if (cap.repondu !== 'modal') throw new Error('pas de formulaire : ' + cap.repondu);
  });
  await test('/ticket close avec raison → fermeture + log', async () => {
    const cap = {};
    store.addTicket(G, 'c-tick2', { numero: 8, userId: 'u-owner', sujet: 'S', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now(), messageId: 'm2' });
    const ch = canalMock('c-tick2', cap);
    await cmdTicket.execute(interMock(cap, { channel: ch, options: optionsMock('close', { strings: { raison: 'réglé' } }) }));
    aRepondu(cap, 'close raison');
    store.removeTicket(G, 'c-tick2');
  });
  await test('/ticket close hors ticket → erreur propre', async () => {
    const cap = {};
    await cmdTicket.execute(interMock(cap, { channel: canalMock('c-pas-ticket', cap), options: optionsMock('close', { strings: { raison: 'x' } }) }));
    aRepondu(cap, 'close hors ticket');
  });

  console.log('── Commandes /setup ──');
  await test('/setup ticket bouton → configuré + panneau', async () => {
    const cap = {};
    await cmdSetup.execute(interMock(cap, { options: optionsMock('bouton', { groupe: 'ticket' }) }));
    aRepondu(cap, 'setup bouton');
  });
  await test('/setup ticket menu → assistant affiché', async () => {
    const cap = {};
    await cmdSetup.execute(interMock(cap, { options: optionsMock('menu', { groupe: 'ticket' }) }));
    aRepondu(cap, 'setup menu');
  });
  store.setGuild(G, { panelMode: 'menu' });

  console.log('── Boutons du panneau & des tickets ──');
  await test('bouton ticket:ouvrir → formulaire', async () => {
    const cap = {};
    await h.handleButton(interMock(cap, { customId: 'ticket:ouvrir' }));
    if (cap.repondu !== 'modal') throw new Error('pas de formulaire');
  });
  await test('bouton ticket:reclamer (staff, libre) → pris en charge', async () => {
    const cap = {};
    store.updateTicket(G, 'c-tick', { claimedBy: null });
    await h.handleButton(interMock(cap, { customId: 'ticket:reclamer' }));
    aRepondu(cap, 'reclamer');
  });
  await test('bouton ticket:reclamer déjà pris → message', async () => {
    const cap = {};
    store.updateTicket(G, 'c-tick', { claimedBy: 'u-autre' });
    await h.handleButton(interMock(cap, { customId: 'ticket:reclamer' }));
    aRepondu(cap, 'reclamer déjà pris');
    store.updateTicket(G, 'c-tick', { claimedBy: null });
  });
  await test('bouton ticket:fermer → formulaire de raison', async () => {
    const cap = {};
    await h.handleButton(interMock(cap, { customId: 'ticket:fermer' }));
    if (cap.repondu !== 'modal') throw new Error('pas de formulaire');
  });
  await test('bouton ticket:confirmer-fermeture → fermeture', async () => {
    const cap = {};
    await h.handleButton(interMock(cap, { customId: 'ticket:confirmer-fermeture' }));
    aRepondu(cap, 'confirmer-fermeture');
  });
  await test('bouton ticket:annuler → annulation propre', async () => {
    const cap = {};
    await h.handleButton(interMock(cap, { customId: 'ticket:annuler' }));
    aRepondu(cap, 'annuler');
  });
  await test('bouton inconnu → réponse (pas de silence)', async () => {
    const cap = {};
    await h.handleButton(interMock(cap, { customId: 'bouton-inconnu' }));
    aRepondu(cap, 'bouton inconnu');
  });

  console.log('── Assistant : boutons du wizard ──');
  for (const [id, att] of [
    ['tkt:wiz-act:t1:nom', 'modal'],
    ['tkt:wiz-act:t1:emoji', 'modal'],
    ['tkt:wiz-act:t1:desc', 'modal'],
    ['tkt:wiz-cat:t1', 'update'],
    ['tkt:wiz-addroles:t1', 'update'],
    ['tkt:wiz-delroles:t1', 'update'],
    ['tkt:wiz-next:t1:nom', 'update'],
    ['tkt:wiz-back:t1:emoji', 'update'],
    ['tkt:wiz-backto:t1:cat', 'update'],
    ['tkt:wiz-done:t1', 'update'],
  ]) {
    await test('bouton ' + id, async () => {
      const cap = {};
      await h.handleButton(interMock(cap, { customId: id }));
      if (cap.repondu !== att) throw new Error('réponse : ' + cap.repondu + ' attendu ' + att);
    });
  }
  await test('bouton tkt:wiz-del:t1 → type supprimé + menu', async () => {
    const cap = {};
    store.setGuild(G, { types: [{ id: 't1', nom: 'Bug', emoji: '🔴', staffRoleIds: [] }, { id: 't2', nom: 'Autre', emoji: '🔵', staffRoleIds: [] }] });
    await h.handleButton(interMock(cap, { customId: 'tkt:wiz-del:t1' }));
    aRepondu(cap, 'wiz-del');
    if (store.getType(G, 't1')) throw new Error('type non supprimé');
    store.setGuild(G, { types: [{ id: 't1', nom: 'Bug', emoji: '🔴', staffRoleIds: ['role-staff'] }] });
  });
  await test('bouton wizard type inexistant → menu (pas de crash)', async () => {
    const cap = {};
    await h.handleButton(interMock(cap, { customId: 'tkt:wiz-next:inconnu:nom' }));
    aRepondu(cap, 'wiz type inconnu');
  });
  await test('bouton wizard non admin → refus', async () => {
    const cap = {};
    await h.handleButton(interMock(cap, { customId: 'tkt:wiz-next:t1:nom', member: { permissions: { has: () => false }, roles: { cache: new Map() } } }));
    aRepondu(cap, 'wiz non admin');
    if (!String(cap.last.content).includes('❌')) throw new Error('refus absent');
  });
  await test('bouton tkt:panel-cancel → retour menu', async () => {
    const cap = {};
    await h.handleButton(interMock(cap, { customId: 'tkt:panel-cancel' }));
    aRepondu(cap, 'panel-cancel');
  });

  console.log('── Menus déroulants ──');
  await test('menu ticket:select-roles → infrastructure + panneau', async () => {
    const cap = {};
    await h.handleSelectMenu(interMock(cap, { customId: 'ticket:select-roles', values: ['role-staff'] }));
    aRepondu(cap, 'select-roles');
  });
  await test('menu tkt:type-ouvrir → formulaire du type', async () => {
    const cap = {};
    await h.handleSelectMenu(interMock(cap, { customId: 'tkt:type-ouvrir', values: ['t1'] }));
    if (cap.repondu !== 'modal') throw new Error('pas de formulaire');
  });
  await test('menu tkt:type-ouvrir type inexistant → erreur propre', async () => {
    const cap = {};
    await h.handleSelectMenu(interMock(cap, { customId: 'tkt:type-ouvrir', values: ['nope'] }));
    aRepondu(cap, 'type-ouvrir inconnu');
  });
  for (const [v, att] of [['__new__', 'modal'], ['__panel__', 'modal'], ['__reset__', 'update'], ['__done__', 'update'], ['t1', 'update']]) {
    await test('menu tkt:main valeur ' + v, async () => {
      const cap = {};
      await h.handleSelectMenu(interMock(cap, { customId: 'tkt:main', values: [v] }));
      if (cap.repondu !== att) throw new Error('réponse : ' + cap.repondu + ' attendu ' + att);
    });
  }
  await test('menu tkt:cat:t1 → catégorie enregistrée', async () => {
    const cap = {};
    await h.handleSelectMenu(interMock(cap, { customId: 'tkt:cat:t1', values: ['cat-a'] }));
    aRepondu(cap, 'cat');
  });
  await test('menu tkt:addroles:t1 → rôles ajoutés', async () => {
    const cap = {};
    await h.handleSelectMenu(interMock(cap, { customId: 'tkt:addroles:t1', values: ['role-staff'] }));
    aRepondu(cap, 'addroles');
  });
  await test('menu tkt:delroles:t1 → rôles retirés (corrigé)', async () => {
    const cap = {};
    store.updateType(G, 't1', { staffRoleIds: ['role-staff', 'role-2'] });
    await h.handleSelectMenu(interMock(cap, { customId: 'tkt:delroles:t1', values: ['role-2'] }));
    aRepondu(cap, 'delroles');
    const t = store.getType(G, 't1');
    if (t.staffRoleIds.includes('role-2')) throw new Error('rôle non retiré');
    if (!String(cap.last.content).includes('retiré')) throw new Error('confirmation absente : ' + cap.last.content);
    store.updateType(G, 't1', { staffRoleIds: ['role-staff'] });
  });
  await test('menu inconnu → réponse (pas de silence)', async () => {
    const cap = {};
    await h.handleSelectMenu(interMock(cap, { customId: 'menu-inconnu', values: ['x'] }));
    aRepondu(cap, 'menu inconnu');
  });

  console.log('── Formulaires (modals) ──');
  await test('modal ticket:sujet → ticket créé', async () => {
    const cap = {};
    store.setGuild(G, { panelMode: 'bouton' });
    await h.handleModal(interMock(cap, { customId: 'ticket:sujet', fields: champsMock({ sujet: 'Ma demande' }) }));
    aRepondu(cap, 'sujet');
    store.setGuild(G, { panelMode: 'menu' });
  });
  await test('modal tkt:sujet:t1 → ticket typé créé', async () => {
    const cap = {};
    await h.handleModal(interMock(cap, { customId: 'tkt:sujet:t1', fields: champsMock({ sujet: 'Ma demande' }) }));
    aRepondu(cap, 'sujet typé');
  });
  await test('modal ticket:raison-fermeture → fermeture', async () => {
    const cap = {};
    store.addTicket(G, 'c-tick3', { numero: 9, userId: 'u-owner', sujet: 'S', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now(), messageId: 'm3' });
    await h.handleModal(interMock(cap, { channel: canalMock('c-tick3', cap), customId: 'ticket:raison-fermeture', fields: champsMock({ raison: 'réglé' }) }));
    aRepondu(cap, 'raison-fermeture');
    store.removeTicket(G, 'c-tick3');
  });
  await test('modal ticket:raison-fermeture hors ticket → erreur propre', async () => {
    const cap = {};
    await h.handleModal(interMock(cap, { channel: canalMock('c-pas-ticket', cap), customId: 'ticket:raison-fermeture', fields: champsMock({ raison: 'x' }) }));
    aRepondu(cap, 'raison hors ticket');
  });
  await test('modal tkt:m-newtype → type créé + wizard', async () => {
    const cap = {};
    await h.handleModal(interMock(cap, { customId: 'tkt:m-newtype', fields: champsMock({ nom: 'Nouveau type' }) }));
    aRepondu(cap, 'm-newtype');
  });
  for (const id of ['tkt:m-rename:t1', 'tkt:m-emoji:t1', 'tkt:m-desc:t1']) {
    await test('modal ' + id, async () => {
      const cap = {};
      await h.handleModal(interMock(cap, { customId: id, fields: champsMock({ nom: 'X', emoji: '🟢', desc: 'D' }) }));
      aRepondu(cap, id);
    });
  }
  await test('modal tkt:m-panel → textes enregistrés', async () => {
    const cap = {};
    await h.handleModal(interMock(cap, { customId: 'tkt:m-panel', fields: champsMock({ titre: 'T', description: 'D', selecteur: 'S', image: '' }) }));
    aRepondu(cap, 'm-panel');
    store.setGuild(G, { panel: { titre: null, description: null, selecteur: null, image: null } });
  });
  await test('modal inconnu → réponse (pas de silence)', async () => {
    const cap = {};
    await h.handleModal(interMock(cap, { customId: 'modal-inconnu', fields: champsMock({}) }));
    aRepondu(cap, 'modal inconnu');
  });

  // nettoyage des tickets ouverts créés par l'audit
  const gFin = store.getGuild(G);
  for (const c of Object.keys((gFin && gFin.open) || {})) store.removeTicket(G, c);

  console.log(`\n${ok} chemins audités OK${process.exitCode ? ' — DES CHEMINS NE RÉPONDENT PAS' : ' — aucun silence, aucun crash ✅'}`);
})();
