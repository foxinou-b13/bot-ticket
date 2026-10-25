/**
 * tests/bouton.js — le système BOUTON de bout en bout
 * Vérifie que CHAQUE réglage est indépendant et modifiable.
 */
const assert = require('node:assert');
const store = require('../utils/store');
const h = require('../handlers/ticketHandler');

let ok = 0, ko = 0;
async function test(nom, fn) {
  try { await fn(); ok++; console.log('  ✅', nom); }
  catch (e) { ko++; console.log('  ❌', nom, '→', e.message); }
}

const GUILD = 'g-bouton';
function reset() {
  store.setGuild(GUILD, {
    panelMode: null,
    categoryId: null, staffRoleIds: [], logChannelId: null, panelChannelId: null, panelMessageId: null,
    panel: { titre: null, description: null, selecteur: null, image: null },
    types: [],
    bouton: {
      configure: false, categoryId: null, panelChannelId: null, logChannelId: null,
      staffRoleIds: [], panelMessageId: null,
      panel: { titre: null, description: null, image: null, bouton: null, boutonEmoji: null },
    },
  });
}

const admin = { permissions: { has: () => true }, roles: { cache: new Map() } };

function mockGuild() {
  const crees = [];
  return {
    id: GUILD,
    name: 'Serveur Bouton',
    roles: { everyone: { id: 'everyone' }, cache: new Map() },
    members: { me: { id: 'bot' } },
    channels: {
      fetch: async id => ({ id, type: 0, permissionOverwrites: { edit: async () => {} } }),
      create: async o => { crees.push(o); return { id: 'cree-' + crees.length, ...o, permissionOverwrites: { edit: async () => {} } }; },
    },
    _crees: crees,
  };
}

function interSelect(customId, values, extra = {}) {
  let out = null;
  return {
    customId, values, guild: mockGuild(), member: admin,
    update: r => { out = r; },
    reply: r => { out = r; },
    get out() { return out; },
    ...extra,
  };
}

function texteDe(o) {
  return JSON.stringify(o || {});
}

(async () => {
  console.log('── Indépendance des réglages ──');

  await test('les réglages bouton ne touchent pas ceux du menu', async () => {
    reset();
    store.setGuild(GUILD, { categoryId: 'cat-menu', staffRoleIds: ['role-menu'], logChannelId: 'log-menu', panelChannelId: 'pan-menu' });
    const i = interSelect('tktb:cat', ['cat-bouton']);
    await h.handleSelectMenu(i);
    const g = store.getGuild(GUILD);
    assert.equal(g.bouton.categoryId, 'cat-bouton', 'bouton non enregistré');
    assert.equal(g.categoryId, 'cat-menu', 'le menu a été modifié !');
  });

  await test('le salon du panneau se choisit', async () => {
    reset();
    const i = interSelect('tktb:salon', ['salon-panneau']);
    await h.handleSelectMenu(i);
    assert.equal(store.getGuild(GUILD).bouton.panelChannelId, 'salon-panneau');
    assert.match(texteDe(i.out), /Salon du panneau/);
  });

  await test('les rôles staff (plusieurs) se choisissent', async () => {
    reset();
    const i = interSelect('tktb:roles', ['r1', 'r2']);
    await h.handleSelectMenu(i);
    assert.deepEqual(store.getGuild(GUILD).bouton.staffRoleIds, ['r1', 'r2']);
  });

  await test('le salon de logs se choisit', async () => {
    reset();
    const i = interSelect('tktb:logs', ['log-x']);
    await h.handleSelectMenu(i);
    assert.equal(store.getGuild(GUILD).bouton.logChannelId, 'log-x');
  });

  console.log('── Textes et bouton ──');

  await test('titre + description se modifient', async () => {
    reset();
    await h.handleModal({
      customId: 'tktb:textes', guild: mockGuild(), member: admin,
      fields: { getTextInputValue: k => ({ titre: 'Mon support', description: 'Écris-nous.', image: '' }[k] || '') },
      reply: () => {}, update: () => {},
    });
    const p = store.getGuild(GUILD).bouton.panel;
    assert.equal(p.titre, 'Mon support');
    assert.equal(p.description, 'Écris-nous.');
  });

  await test('texte + emoji du bouton se modifient', async () => {
    reset();
    await h.handleModal({
      customId: 'tktb:bouton', guild: mockGuild(), member: admin,
      fields: { getTextInputValue: k => ({ libelle: 'Besoin d aide', emoji: '📩' }[k] || '') },
      reply: () => {}, update: () => {},
    });
    const p = store.getGuild(GUILD).bouton.panel;
    assert.equal(p.bouton, 'Besoin d aide');
    assert.equal(p.boutonEmoji, '📩');
  });

  await test('emoji invalide refusé, réglage conservé', async () => {
    reset();
    let rep = null;
    await h.handleModal({
      customId: 'tktb:bouton', guild: mockGuild(), member: admin,
      fields: { getTextInputValue: k => ({ libelle: 'X', emoji: 'pas-un-emoji' }[k] || '') },
      reply: r => { rep = r; }, update: () => {},
    });
    assert.equal(store.getGuild(GUILD).bouton.panel.boutonEmoji, null);
    assert.match(texteDe(rep), /pas valide/);
  });

  console.log('── Le panneau publié ──');

  await test('le panneau bouton utilise les textes réglés, sans bannière', async () => {
    reset();
    store.setGuild(GUILD, {
      panelMode: 'bouton',
      bouton: {
        configure: true, categoryId: 'c', panelChannelId: 'p', logChannelId: 'l', staffRoleIds: ['r'],
        panelMessageId: null,
        panel: { titre: 'Titre maison', description: 'Texte maison.', image: null, bouton: 'Écrire', boutonEmoji: '📩' },
      },
    });
    const payload = h.construirePanneau(store.getGuild(GUILD), {}, 'Serveur');
    const json = JSON.stringify(payload.toJSON ? payload.toJSON() : payload);
    assert.ok(json.includes('Titre maison'), 'titre réglé absent');
    assert.ok(json.includes('Texte maison'), 'description réglée absente');
    assert.ok(json.includes('Écrire'), 'texte du bouton absent');
    assert.ok(!json.includes('attachment://'), 'bannière présente');
    assert.ok(!json.includes('Informations importantes'), 'texte du menu repris');
  });

  await test('sans réglage, le panneau bouton a un texte par défaut (pas celui du menu)', async () => {
    reset();
    const payload = h.construirePanneau({ ...store.getGuild(GUILD), panelMode: 'bouton', bouton: { ...store.getGuild(GUILD).bouton, configure: true } }, {}, 'Serveur');
    const json = JSON.stringify(payload);
    assert.ok(json.includes('Bienvenue sur le support de'), 'texte par défaut absent');
    assert.ok(!json.includes('Informations importantes'));
  });

  console.log('── Sécurité ──');

  await test('non-admin refusé sur tous les réglages', async () => {
    reset();
    for (const id of ['tktb:salon', 'tktb:cat', 'tktb:logs', 'tktb:roles', 'tktb:main']) {
      let rep = null;
      await h.handleSelectMenu({
        customId: id, values: ['x'], guild: mockGuild(),
        member: { permissions: { has: () => false }, roles: { cache: new Map() } },
        reply: r => { rep = r; }, update: () => {},
      });
      assert.match(texteDe(rep), /Gérer le serveur/, id + ' non bloqué');
    }
    assert.equal(store.getGuild(GUILD).bouton.categoryId, null);
  });

  await test('« Terminer » refuse si un réglage manque, et dit lequel', async () => {
    reset();
    const i = interSelect('tktb:main', ['terminer']);
    await h.handleSelectMenu(i);
    const t = texteDe(i.out);
    assert.match(t, /salon du panneau/);
    assert.match(t, /catégorie des tickets/);
    assert.match(t, /salon de logs/);
    assert.match(t, /rôle staff/);
    assert.equal(store.getGuild(GUILD).panelMode, null, 'config enregistrée alors qu\'il manque des réglages');
  });

  await test('« Terminer » complet → panneau publié dans le salon choisi', async () => {
    reset();
    store.setGuild(GUILD, {
      bouton: {
        configure: false, categoryId: 'cat-1', panelChannelId: 'salon-panneau', logChannelId: 'log-1',
        staffRoleIds: ['role-1'], panelMessageId: null,
        panel: { titre: null, description: null, image: null, bouton: null, boutonEmoji: null },
      },
    });
    let envoye = null;
    let conf = null;
    const canal = {
      id: 'salon-panneau',
      permissionOverwrites: { edit: async () => {} },
      messages: { fetch: async () => null },
      send: async p => { envoye = p; return { id: 'msg-panneau', pin: async () => {} }; },
    };
    const guild = mockGuild();
    guild.channels.fetch = async id => (id === 'salon-panneau' ? canal : { id, permissionOverwrites: { edit: async () => {} } });
    await h.handleSelectMenu({
      customId: 'tktb:main', values: ['terminer'], guild, member: admin,
      update: r => { conf = r; }, reply: r => { conf = r; },
    });
    const g = store.getGuild(GUILD);
    assert.equal(g.panelMode, 'bouton', 'mode non enregistré');
    assert.equal(g.bouton.configure, true, 'pas marqué configuré');
    assert.equal(g.bouton.panelMessageId, 'msg-panneau', 'message non mémorisé');
    assert.ok(envoye && envoye.embeds && envoye.embeds.length, 'panneau non envoyé');
    assert.match(texteDe(conf), /publié|prêt/);
  });

  await test('création automatique des salons', async () => {
    reset();
    const guild = mockGuild();
    const i = interSelect('tktb:main', ['auto'], { guild });
    await h.handleSelectMenu(i);
    const g = store.getGuild(GUILD);
    assert.equal(guild._crees.length, 3, 'salons créés : ' + guild._crees.length);
    assert.ok(g.bouton.categoryId && g.bouton.panelChannelId && g.bouton.logChannelId, 'ids non enregistrés');
  });

  console.log(`\n${ok} tests du système BOUTON OK${ko ? ' — ÉCHEC de ' + ko : ' ✅'}`);
  process.exit(ko ? 1 : 0);
})();
