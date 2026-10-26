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

  await test('les réglages du panneau bouton ne touchent pas ceux du menu', async () => {
    reset();
    store.setGuild(GUILD, { categoryId: 'cat-menu', staffRoleIds: ['role-menu'], logChannelId: 'log-menu', panelChannelId: 'pan-menu' });
    await h.handleSelectMenu(interSelect('tktb:salon', ['salon-bouton']));
    await h.handleSelectMenu(interSelect('tktb:logs', ['log-bouton']));
    const g = store.getGuild(GUILD);
    assert.equal(g.bouton.panelChannelId, 'salon-bouton', 'salon bouton non enregistré');
    assert.equal(g.bouton.logChannelId, 'log-bouton');
    assert.equal(g.panelChannelId, 'pan-menu', 'le panneau du menu a été modifié !');
    assert.equal(g.logChannelId, 'log-menu', 'le log du menu a été modifié !');
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

  await test('texte + emoji d\'un bouton créé se modifient', async () => {
    reset();
    const b = store.getGuild(GUILD).bouton;
    store.setGuild(GUILD, { bouton: { ...b, items: [{ id: 'x', label: 'Avant', emoji: '🎫', couleur: 'vert', categoryId: null, staffRoleIds: [] }] } });
    await h.handleModal({
      customId: 'tktb:item-texte:x', guild: mockGuild(), member: admin,
      fields: { getTextInputValue: k => ({ libelle: 'Besoin d aide', emoji: '📩' }[k] || '') },
      reply: () => {}, update: () => {},
    });
    const p = store.getGuild(GUILD).bouton.items[0];
    assert.equal(p.label, 'Besoin d aide');
    assert.equal(p.emoji, '📩');
  });

  await test('emoji invalide refusé, réglage conservé', async () => {
    reset();
    const b = store.getGuild(GUILD).bouton;
    store.setGuild(GUILD, { bouton: { ...b, items: [{ id: 'x', label: 'Bug', emoji: '🐞', couleur: 'vert', categoryId: null, staffRoleIds: [] }] } });
    let rep = null;
    await h.handleModal({
      customId: 'tktb:item-texte:x', guild: mockGuild(), member: admin,
      fields: { getTextInputValue: k => ({ libelle: 'X', emoji: 'pas-un-emoji' }[k] || '') },
      reply: r => { rep = r; }, update: r => { rep = r; },
    });
    assert.equal(store.getGuild(GUILD).bouton.items[0].emoji, '🐞', 'emoji remplacé alors qu\'il est invalide');
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
        items: [{ id: 'it', label: 'Écrire', emoji: '📩', couleur: 'bleu', categoryId: null, staffRoleIds: [] }],
        panel: { titre: 'Titre maison', description: 'Texte maison.', image: null },
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
    assert.match(t, /salon de logs/);
    assert.match(t, /au moins un bouton/);
    assert.equal(store.getGuild(GUILD).panelMode, null, 'config enregistrée alors qu\'il manque des réglages');
  });

  await test('« Terminer » complet → panneau publié dans le salon choisi', async () => {
    reset();
    store.setGuild(GUILD, {
      bouton: {
        configure: false, categoryId: 'cat-1', panelChannelId: 'salon-panneau', logChannelId: 'log-1',
        staffRoleIds: ['role-1'], panelMessageId: null,
        items: [{ id: 'it', label: 'Support', emoji: '🎫', couleur: 'vert', categoryId: 'cat-1', staffRoleIds: ['role-1'] }],
        panel: { titre: null, description: null, image: null },
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

  await test('un bouton incomplet bloque la publication (et dit lequel)', async () => {
    reset();
    store.setGuild(GUILD, {
      bouton: {
        configure: false, categoryId: null, panelChannelId: 'p', logChannelId: 'l', staffRoleIds: [], panelMessageId: null,
        items: [
          { id: 'a', label: 'Support', couleur: 'vert', categoryId: 'c1', staffRoleIds: ['r1'] },
          { id: 'b', label: 'Bug', couleur: 'rouge', categoryId: null, staffRoleIds: [] },
        ],
        panel: {},
      },
    });
    const i = interSelect('tktb:main', ['terminer']);
    await h.handleSelectMenu(i);
    const t = texteDe(i.out);
    assert.match(t, /Bug/);
    assert.match(t, /catégorie/);
    assert.match(t, /staff/);
    assert.equal(store.getGuild(GUILD).bouton.configure, false, 'publié malgré un bouton incomplet');
  });

  console.log('── Boutons multiples ──');

  await test('ajouter un bouton avec texte + emoji', async () => {
    reset();
    await h.handleModal({
      customId: 'tktb:item-new', guild: mockGuild(), member: admin,
      fields: { getTextInputValue: k => ({ libelle: 'Support', emoji: '🎫' }[k] || '') },
      reply: () => {}, update: () => {},
    });
    const items = store.getGuild(GUILD).bouton.items;
    assert.equal(items.length, 1);
    assert.equal(items[0].label, 'Support');
    assert.equal(items[0].emoji, '🎫');
    assert.equal(items[0].couleur, 'vert');
  });

  await test('chaque bouton a sa couleur', async () => {
    reset();
    const b = store.getGuild(GUILD).bouton;
    store.setGuild(GUILD, { bouton: { ...b, items: [{ id: 'x', label: 'Bug', emoji: '🐞', couleur: 'vert', categoryId: null, staffRoleIds: [] }] } });
    await h.handleSelectMenu(interSelect('tktb:item-couleur:x', ['rouge']));
    assert.equal(store.getGuild(GUILD).bouton.items[0].couleur, 'rouge');
  });

  await test('chaque bouton a sa catégorie', async () => {
    reset();
    const b = store.getGuild(GUILD).bouton;
    store.setGuild(GUILD, { bouton: { ...b, items: [{ id: 'x', label: 'Bug', couleur: 'bleu', categoryId: null, staffRoleIds: [] }] } });
    await h.handleSelectMenu(interSelect('tktb:item-cat:x', ['cat-bug']));
    assert.equal(store.getGuild(GUILD).bouton.items[0].categoryId, 'cat-bug');
  });

  await test('chaque bouton a ses rôles staff', async () => {
    reset();
    const b = store.getGuild(GUILD).bouton;
    store.setGuild(GUILD, { bouton: { ...b, items: [{ id: 'x', label: 'Bug', couleur: 'bleu', categoryId: null, staffRoleIds: [] }] } });
    await h.handleSelectMenu(interSelect('tktb:item-roles:x', ['r-bug', 'r-dev']));
    assert.deepEqual(store.getGuild(GUILD).bouton.items[0].staffRoleIds, ['r-bug', 'r-dev']);
  });

  await test('supprimer un bouton ne touche pas les autres', async () => {
    reset();
    const b = store.getGuild(GUILD).bouton;
    store.setGuild(GUILD, { bouton: { ...b, items: [
      { id: 'a', label: 'A', couleur: 'bleu', categoryId: null, staffRoleIds: [] },
      { id: 'b', label: 'B', couleur: 'bleu', categoryId: null, staffRoleIds: [] },
    ] } });
    await h.handleSelectMenu(interSelect('tktb:item-action:b', ['supprimer']));
    const items = store.getGuild(GUILD).bouton.items;
    assert.equal(items.length, 1);
    assert.equal(items[0].id, 'a');
  });

  await test('le panneau affiche tous les boutons, 5 par ligne', async () => {
    reset();
    const items = Array.from({ length: 6 }, (_, i) => ({
      id: 'i' + i, label: 'Bouton ' + i, emoji: null, couleur: 'bleu', categoryId: null, staffRoleIds: [],
    }));
    store.setGuild(GUILD, {
      panelMode: 'bouton',
      bouton: { configure: true, categoryId: 'c', panelChannelId: 'p', logChannelId: 'l', staffRoleIds: ['r'], items, panel: {} },
    });
    const payload = h.construirePanneau(store.getGuild(GUILD), {}, 'S');
    assert.equal(payload.components.length, 2, 'lignes = ' + payload.components.length);
    assert.equal(payload.components[0].toJSON().components.length, 5);
    assert.equal(payload.components[1].toJSON().components.length, 1);
  });

  await test('chaque bouton porte sa couleur Discord', async () => {
    reset();
    const items = [
      { id: 'a', label: 'A', couleur: 'bleu', categoryId: null, staffRoleIds: [] },
      { id: 'b', label: 'B', couleur: 'vert', categoryId: null, staffRoleIds: [] },
      { id: 'c', label: 'C', couleur: 'gris', categoryId: null, staffRoleIds: [] },
      { id: 'd', label: 'D', couleur: 'rouge', categoryId: null, staffRoleIds: [] },
    ];
    store.setGuild(GUILD, {
      panelMode: 'bouton',
      bouton: { configure: true, categoryId: 'c', panelChannelId: 'p', logChannelId: 'l', staffRoleIds: ['r'], items, panel: {} },
    });
    const styles = h.construirePanneau(store.getGuild(GUILD), {}, 'S').components[0].toJSON().components.map(c => c.style);
    assert.deepEqual(styles, [1, 3, 2, 4]);
  });

  await test('sans bouton créé → panneau SANS aucun bouton', async () => {
    reset();
    store.setGuild(GUILD, {
      panelMode: 'bouton',
      bouton: { configure: true, categoryId: 'c', panelChannelId: 'p', logChannelId: 'l', staffRoleIds: ['r'], items: [], panel: {} },
    });
    const payload = h.construirePanneau(store.getGuild(GUILD), {}, 'S');
    assert.equal(payload.components.length, 0, 'bouton par défaut présent : ' + payload.components.length);
    assert.ok(payload.embeds && payload.embeds.length, 'le panneau doit rester visible');
  });

  await test('25 boutons maximum', async () => {
    reset();
    const b = store.getGuild(GUILD).bouton;
    const items = Array.from({ length: 25 }, (_, i) => ({ id: 'i' + i, label: 'B' + i, couleur: 'bleu', categoryId: null, staffRoleIds: [] }));
    store.setGuild(GUILD, { bouton: { ...b, items } });
    let rep = null;
    await h.handleModal({
      customId: 'tktb:item-new', guild: mockGuild(), member: admin,
      fields: { getTextInputValue: k => ({ libelle: 'Trop', emoji: '' }[k] || '') },
      reply: r => { rep = r; }, update: r => { rep = r; },
    });
    assert.equal(store.getGuild(GUILD).bouton.items.length, 25);
    assert.match(texteDe(rep), /25 boutons/);
  });

  await test('clic sur un bouton du panneau → formulaire de ce bouton', async () => {
    reset();
    const b = store.getGuild(GUILD).bouton;
    store.setGuild(GUILD, { bouton: { ...b, items: [{ id: 'zz', label: 'Bug', emoji: '🐞', couleur: 'rouge', categoryId: 'c', staffRoleIds: ['r'] }] } });
    let modal = null;
    await h.handleButton({
      customId: 'ticket:ouvrir:zz', guild: mockGuild(),
      user: { id: 'u1' }, member: admin,
      showModal: m => { modal = m; },
    });
    assert.ok(modal, 'aucun formulaire ouvert');
    const json = JSON.stringify(modal.toJSON ? modal.toJSON() : modal);
    assert.ok(json.includes('ticket:item:zz'), 'formulaire sans identifiant de bouton : ' + json.slice(0, 150));
  });

  await test('bouton supprimé entre-temps → message clair, pas de crash', async () => {
    reset();
    let rep = null;
    await h.handleButton({
      customId: 'ticket:ouvrir:disparu', guild: mockGuild(),
      user: { id: 'u1' }, member: admin,
      reply: r => { rep = r; }, showModal: () => { throw new Error('ne doit pas ouvrir de formulaire'); },
    });
    assert.match(texteDe(rep), /n'existe plus/);
  });


  await test('le ticket se crée dans la catégorie ET avec le staff du bouton', async () => {
    reset();
    const guildB = mockGuild();
    let cree = null;
    guildB.channels.create = async o => {
      cree = o;
      return { id: 'salon-ticket', send: async () => ({ id: 'msg', pin: async () => {} }), permissionOverwrites: { edit: async () => {} } };
    };
    const item = { id: 'it', label: 'Bug', emoji: '🐞', couleur: 'rouge', categoryId: 'CAT-DU-BOUTON', staffRoleIds: ['ROLE-DU-BOUTON'] };
    store.setGuild(GUILD, {
      panelMode: 'bouton',
      categoryId: 'cat-generale', staffRoleIds: ['role-general'],
      bouton: { configure: true, categoryId: 'cat-generale', panelChannelId: 'p', logChannelId: 'l', staffRoleIds: ['role-general'], items: [item], panel: {} },
    });
    const res = await h.creerTicket(
      { guild: guildB, user: { id: 'membre-1' }, client: { user: { id: 'bot' } } },
      'Mon jeu plante au lancement',
      null,
      item
    );
    assert.ok(res.salon, 'ticket non créé : ' + JSON.stringify(res));
    assert.equal(cree.parent, 'CAT-DU-BOUTON', 'mauvaise catégorie : ' + cree.parent);
    const ids = (cree.permissionOverwrites || []).map(p => p.id);
    assert.ok(ids.includes('ROLE-DU-BOUTON'), 'le staff du bouton n\'a pas accès : ' + ids.join(','));
    assert.ok(!ids.includes('role-general'), 'le staff général a été ajouté à tort');
  });

  await test('sans catégorie/rôles sur le bouton → réglages généraux', async () => {
    reset();
    const guildC = mockGuild();
    let cree = null;
    guildC.channels.create = async o => {
      cree = o;
      return { id: 'salon-ticket-2', send: async () => ({ id: 'msg', pin: async () => {} }), permissionOverwrites: { edit: async () => {} } };
    };
    const item = { id: 'it2', label: 'Autre', couleur: 'gris', categoryId: null, staffRoleIds: [] };
    store.setGuild(GUILD, {
      panelMode: 'bouton',
      categoryId: 'cat-generale', staffRoleIds: ['role-general'],
      bouton: { configure: true, categoryId: 'cat-generale', panelChannelId: 'p', logChannelId: 'l', staffRoleIds: ['role-general'], items: [item], panel: {} },
    });
    await h.creerTicket({ guild: guildC, user: { id: 'membre-2' }, client: { user: { id: 'bot' } } }, 'Une question', null, item);
    assert.equal(cree.parent, 'cat-generale');
    assert.ok((cree.permissionOverwrites || []).map(p => p.id).includes('role-general'));
  });

  await test('aucun bouton par défaut proposé : un bouton = toujours créé à la main', async () => {
    reset();
    const b = store.getGuild(GUILD).bouton;
    assert.deepEqual(b.items, []);
    const payload = h.construirePanneau({ ...store.getGuild(GUILD), panelMode: 'bouton', bouton: { ...b, configure: true } }, {}, 'S');
    assert.equal(payload.components.length, 0);
  });


  await test('l\'écran principal ne propose plus catégorie/staff/auto', async () => {
    reset();
    store.setGuild(GUILD, {
      bouton: { configure: false, categoryId: null, panelChannelId: 'p', logChannelId: 'l', staffRoleIds: [], items: [], panel: {}, panelMessageId: null },
    });
    const i = interSelect('tktb:main', ['salon']);
    await h.handleSelectMenu(i);
    // les composants sont imbriqués dans une carte : on descend récursivement
    const valeurs = [];
    const descendre = node => {
      if (!node) return;
      const j = node.toJSON ? node.toJSON() : node;
      if (j.type === 3 && Array.isArray(j.options)) j.options.forEach(o => valeurs.push(o.value));
      (j.components || []).forEach(descendre);
    };
    (i.out.components || []).forEach(descendre);
    assert.ok(valeurs.includes('salon'), 'menu principal absent');
    assert.ok(!valeurs.includes('categorie'), 'option « catégorie » encore présente');
    assert.ok(!valeurs.includes('roles'), 'option « rôles staff » encore présente');
    assert.ok(!valeurs.includes('auto'), 'option « créer automatiquement » encore présente');
    assert.ok(!valeurs.includes('bouton'), 'option « texte et emoji du bouton » encore présente');
    assert.ok(valeurs.includes('items') && valeurs.includes('textes') && valeurs.includes('terminer'));
  });

  await test('chaque bouton a SA catégorie et SON staff, indépendants', async () => {
    reset();
    store.setGuild(GUILD, {
      bouton: {
        configure: true, categoryId: null, panelChannelId: 'p', logChannelId: 'l', staffRoleIds: [], panelMessageId: null,
        items: [
          { id: 'a', label: 'Support', couleur: 'vert', categoryId: 'CAT-A', staffRoleIds: ['R-A'] },
          { id: 'b', label: 'Bug', couleur: 'rouge', categoryId: 'CAT-B', staffRoleIds: ['R-B'] },
        ],
        panel: {},
      },
    });
    const guild = mockGuild();
    let dernier = null;
    guild.channels.create = async o => {
      dernier = o;
      return { id: 'salon', send: async () => ({ id: 'm', pin: async () => {} }), permissionOverwrites: { edit: async () => {} } };
    };
    const b = store.getGuild(GUILD).bouton;
    await h.creerTicket({ guild, user: { id: 'u' }, client: { user: { id: 'bot' } } }, 'test A', null, b.items[0]);
    assert.equal(dernier.parent, 'CAT-A');
    assert.ok(dernier.permissionOverwrites.map(p => p.id).includes('R-A'));
    await h.creerTicket({ guild, user: { id: 'u2' }, client: { user: { id: 'bot' } } }, 'test B', null, b.items[1]);
    assert.equal(dernier.parent, 'CAT-B');
    const ids = dernier.permissionOverwrites.map(p => p.id);
    assert.ok(ids.includes('R-B'));
    assert.ok(!ids.includes('R-A'), 'le staff du bouton A a été ajouté au ticket du bouton B');
  });

  await test('bouton incomplet → ouverture refusée avec message clair', async () => {
    reset();
    const item = { id: 'inc', label: 'Brouillon', couleur: 'bleu', categoryId: null, staffRoleIds: [] };
    store.setGuild(GUILD, {
      bouton: { configure: true, categoryId: null, panelChannelId: 'p', logChannelId: 'l', staffRoleIds: [], items: [item], panel: {}, panelMessageId: null },
    });
    const res = await h.creerTicket({ guild: mockGuild(), user: { id: 'u' }, client: { user: { id: 'bot' } } }, 'test', null, item);
    assert.ok(res.erreur, 'aucune erreur renvoyée');
    assert.match(res.erreur, /pas encore terminé/);
  });


  await test('un serveur jamais configuré n\'a AUCUN bouton', async () => {
    const neuf = 'g-jamais-touche';
    const g = store.getGuild(neuf);
    assert.deepEqual(g.bouton.items, [], 'des boutons existent déjà : ' + JSON.stringify(g.bouton.items));
    assert.equal(g.bouton.configure, false);
  });

  await test('le panneau d\'un serveur neuf n\'affiche aucun bouton', async () => {
    const g = store.getGuild('g-jamais-touche');
    const payload = h.construirePanneau({ ...g, panelMode: 'bouton', bouton: { ...g.bouton, configure: true } }, {}, 'Neuf');
    assert.equal(payload.components.length, 0);
    assert.ok(payload.embeds && payload.embeds.length, 'le panneau doit quand même exister');
  });

  await test('impossible de publier sans avoir créé de bouton', async () => {
    const neuf = 'g-publie-vide';
    store.setGuild(neuf, {
      bouton: { configure: false, panelChannelId: 'p', logChannelId: 'l', staffRoleIds: [], items: [], panel: {}, panelMessageId: null, categoryId: null },
    });
    const gVide = mockGuild();
    gVide.id = neuf;
    const i = { customId: 'tktb:main', values: ['terminer'], guild: gVide, member: admin, reply: () => {}, update: r => { i.out = r; } };
    await h.handleSelectMenu(i);
    assert.match(texteDe(i.out), /au moins un bouton/);
    assert.equal(store.getGuild(neuf).bouton.configure, false, 'publié malgré l\'absence de bouton');
  });

  await test('aucun bouton créé automatiquement dans le code', async () => {
    const fs = require('node:fs');
    const src = fs.readFileSync(require('node:path').join(__dirname, '..', 'handlers', 'ticketHandler.js'), 'utf8');
    // la seule ligne qui ajoute un bouton est celle du formulaire « Ajouter un bouton »
    const ajouts = src.split('\n').filter(l => /items:\s*\[\.\.\.\s*b\.items/.test(l));
    assert.equal(ajouts.length, 1, 'plusieurs endroits ajoutent des boutons : ' + ajouts.length);
    // ce point d'ajout doit se trouver DANS le traitement du formulaire « Ajouter un bouton »
    const lignes = src.split('\n');
    const index = lignes.findIndex(l => /items:\s*\[\.\.\.\s*b\.items/.test(l));
    const avant = lignes.slice(0, index).reverse().find(l => /if \(id ===|const item = \{/.test(l)) || '';
    assert.match(avant, /const item = \{/, 'la ligne d\'ajout ne suit pas la construction du bouton saisi');
    // aucun pré-remplissage
    assert.ok(!/label:\s*'(Support|Bug|Achat)'/.test(src), 'un bouton est pré-rempli dans le code');
  });

  console.log(`\n${ok} tests du système BOUTON OK${ko ? ' — ÉCHEC de ' + ko : ' ✅'}`);
  process.exit(ko ? 1 : 0);
})();
