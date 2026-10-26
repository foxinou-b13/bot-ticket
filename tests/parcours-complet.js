/**
 * tests/parcours-complet.js — le parcours RÉEL d'un admin, du début à la fin.
 * On enchaîne les vrais handlers : commande, menus, boutons, modales, publication, ticket, réinitialisation.
 */
const assert = require('node:assert');
const store = require('../utils/store');
const h = require('../handlers/ticketHandler');

let ok = 0, ko = 0;
async function test(nom, fn) {
  try { await fn(); ok++; console.log('  ✅', nom); }
  catch (e) { ko++; console.log('  ❌', nom, '→', e.message); }
}

const G = 'g-parcours-' + Date.now();
const admin = { permissions: { has: () => true }, roles: { cache: new Map() } };

function guildMock() {
  const envoyes = [];
  const salon = {
    id: 'SALON-PAN', type: 0, permissionOverwrites: { edit: async () => {} },
    messages: { fetch: async () => null },
    send: async p => { envoyes.push(p); return { id: 'MSG-PAN-' + envoyes.length }; },
  };
  return {
    id: G, name: 'Serveur Test',
    roles: { everyone: { id: 'everyone' }, cache: new Map() },
    members: { me: { id: 'bot' } },
    client: { user: { id: 'bot' } },
    channels: {
      fetch: async () => salon,
      create: async o => ({ id: 'cree', ...o, permissionOverwrites: { edit: async () => {} } }),
      cache: new Map(),
    },
    _envoyes: envoyes,
  };
}

const inter = (customId, extra = {}) => {
  const it = {
    customId, guild: guildMock(), member: admin, values: [], user: admin,
    client: { user: { id: 'bot' } },
    reply: r => { it.out = r; }, update: r => { it.out = r; },
    showModal: m => { it.modal = m; }, deferReply: async () => {},
    ...extra,
  };
  return it;
};
const txt = o => JSON.stringify(o || {});
const vals = o => {
  const acc = [];
  const d = n => {
    if (!n) return;
    const j = n.toJSON ? n.toJSON() : n;
    if (j.type === 1 && j.components) j.components.forEach(c => acc.push(c));
    (j.components || []).forEach(d);
  };
  (o.components || []).forEach(d);
  return acc;
};

(async () => {
  console.log('── Parcours complet d\'un admin ──');

  await test('la commande ouvre l\'assistant à l\'écran 1/6', async () => {
    const it = inter('x');
    await h.configBouton(it);
    assert.match(txt(it.out), /1\/6/);
  });

  const g = guildMock();
  let it;

  await test('écran 1 → choix du salon du panneau', async () => {
    it = inter('tktb:salon', { guild: g, values: ['SALON-PAN'] });
    await h.handleSelectMenu(it);
    assert.equal(store.getGuild(G).bouton.panelChannelId, 'SALON-PAN');
    assert.match(txt(it.out), /1\/6/);
  });

  await test('écran 2 → salon de logs choisi', async () => {
    it = inter('tktb:etape:2', { guild: g });
    await h.handleButton(it);
    assert.match(txt(it.out), /2\/6/);
    const sel = vals(it.out).find(c => c.type === 8);
    assert.ok(sel, 'aucun sélecteur de logs');
    it = inter('tktb:logs', { guild: g, values: ['SALON-LOG'] });
    await h.handleSelectMenu(it);
    assert.equal(store.getGuild(G).bouton.logChannelId, 'SALON-LOG');
  });

  await test('écran 3 → renommer le titre par la modale', async () => {
    it = inter('tktb:etape:3', { guild: g });
    await h.handleButton(it);
    const ren = vals(it.out).find(c => c.label === 'Renommer');
    assert.ok(ren, 'bouton Renommer absent');
    it = inter(ren.custom_id, { guild: g });
    await h.handleButton(it);
    assert.ok(it.modal, 'aucune modale ouverte');
    it = inter('tktb:titre', { guild: g, fields: { getTextInputValue: () => '🎫 Besoin d\'aide ?' } });
    await h.handleModal(it);
    assert.equal(store.getGuild(G).bouton.panel.titre, '🎫 Besoin d\'aide ?');
    assert.match(txt(it.out), /3\/6/);
  });

  await test('écran 4 → description par la modale', async () => {
    it = inter('tktb:etape:4', { guild: g });
    await h.handleButton(it);
    it = inter('tktb:desc', { guild: g, fields: { getTextInputValue: () => 'Ouvre un ticket, on te répond vite.' } });
    await h.handleModal(it);
    assert.equal(store.getGuild(G).bouton.panel.description, 'Ouvre un ticket, on te répond vite.');
    assert.match(txt(it.out), /4\/6/);
  });

  await test('écran 5 → créer un bouton et le régler en 4 écrans', async () => {
    it = inter('tktb:etape:5', { guild: g });
    await h.handleButton(it);
    const menu = vals(it.out).find(c => c.custom_id === 'tktb:items');
    assert.ok(menu, 'aucun menu de boutons');
    assert.ok(!menu.options.some(o => o.value === '__back__'), 'doublon Retour présent');

    it = inter('tktb:items', { guild: g, values: ['__add__'] });
    await h.handleSelectMenu(it);
    assert.ok(it.modal, 'la modale de création ne s\'ouvre pas');
    it = inter('tktb:item-new', {
      guild: g,
      fields: { getTextInputValue: k => ({ libelle: 'Support', emoji: '🎫' }[k] || '') },
    });
    await h.handleModal(it);
    assert.match(txt(it.out), /1\/4/, 'le parcours du bouton ne démarre pas');

    const item = store.getGuild(G).bouton.items[0];
    it = inter(`tktb:item-couleur:${item.id}`, { guild: g, values: ['vert'] });
    await h.handleSelectMenu(it);
    assert.equal(store.getGuild(G).bouton.items[0].couleur, 'vert');

    it = inter(`tktb:item-cat:${item.id}`, { guild: g, values: ['CAT-TICKETS'] });
    await h.handleSelectMenu(it);
    assert.equal(store.getGuild(G).bouton.items[0].categoryId, 'CAT-TICKETS');

    it = inter(`tktb:item-roles:${item.id}`, { guild: g, values: ['ROLE-STAFF'] });
    await h.handleSelectMenu(it);
    assert.deepEqual(store.getGuild(G).bouton.items[0].staffRoleIds, ['ROLE-STAFF']);

    it = inter(`tktb:btn:${item.id}:fin`, { guild: g });
    await h.handleButton(it);
    assert.match(txt(it.out), /5\/6/, '« Terminé » ne ramène pas à l\'écran 5');
  });

  await test('écran 6 → récapitulatif complet et Publier actif', async () => {
    it = inter('tktb:etape:6', { guild: g });
    await h.handleButton(it);
    const t = txt(it.out);
    assert.match(t, /récapitulatif/i);
    assert.match(t, /Support/);
    const pub = vals(it.out).find(c => c.custom_id === 'tktb:publier');
    assert.ok(pub && pub.disabled !== true, 'Publier devrait être actif');
  });

  await test('Publier → panneau envoyé, sans bannière ni texte du MENU', async () => {
    it = inter('tktb:publier', { guild: g });
    await h.handleButton(it);
    assert.ok(g._envoyes.length >= 1, 'rien envoyé dans le salon');
    const p = g._envoyes[g._envoyes.length - 1];
    assert.equal(p.embeds && p.embeds.length, 1, 'le panneau doit être un seul embed');
    assert.ok(!p.embeds[0].data.image, 'le panneau BOUTON ne doit pas avoir de bannière');
    assert.match(p.embeds[0].data.title, /Besoin d'aide/);
    assert.match(p.embeds[0].data.description, /Ouvre un ticket/);
    const btns = vals(p);
    assert.equal(btns.length, 1, 'un seul bouton attendu');
    assert.equal(btns[0].custom_id, 'ticket:ouvrir:' + store.getGuild(G).bouton.items[0].id);
    assert.equal(store.getGuild(G).bouton.configure, true);
  });

  await test('le ticket créé depuis le panneau suit le bouton (catégorie + staff)', async () => {
    const item = store.getGuild(G).bouton.items[0];
    const cree = [];
    const ticketSalon = {
      id: 'TICKET-1', name: 'ticket-0001', permissionOverwrites: { edit: async () => {} },
      send: async () => ({ id: 'msg-ticket', pin: async () => {}, edit: async () => {} }),
    };
    const g2 = guildMock();
    g2.channels.create = async o => { cree.push(o); return ticketSalon; };
    g2.channels.fetch = async id => (id === 'SALON-PAN' ? g2.channels.cache.get('x') || ticketSalon : ticketSalon);
    g2.members = { me: { id: 'bot' }, fetch: async () => ({ id: 'membre-e2e' }) };
    const membre = {
      id: 'membre-e2e', user: { id: 'membre-e2e', username: 'Testeur', bot: false, displayAvatarURL: () => 'x' },
      guild: g2, displayName: 'Testeur', permissions: { has: () => false }, roles: { cache: new Map() },
    };
    const i2 = inter('ticket:ouvrir:' + item.id, { guild: g2, member: membre, user: membre.user });
    await h.handleButton(i2);
    assert.ok(i2.modal, 'le clic n\'ouvre pas la fenêtre « raison »');
    const i3 = inter('ticket:item:' + item.id, {
      guild: g2, member: membre, user: membre.user,
      fields: { getTextInputValue: () => '```\nBonjour,\nmon problème.\n```' },
    });
    await h.handleModal(i3);
    assert.ok(cree.length >= 1, 'aucun salon de ticket créé');
    assert.equal(cree[0].parent, 'CAT-TICKETS', 'mauvaise catégorie');
    const perms = JSON.stringify(cree[0].permissionOverwrites || [], (k, v) => (typeof v === 'bigint' ? String(v) : v));
    assert.match(perms, /ROLE-STAFF/, 'le staff du bouton n\'a pas accès');
  });

  await test('Réinitialiser demande confirmation et « Non » ne supprime RIEN', async () => {
    store.setGuild(G, { bouton: { ...store.getGuild(G).bouton, configure: true } });
    it = inter('tktb:reinit', { guild: g });
    await h.handleButton(it);
    const oui = vals(it.out).find(c => c.custom_id === 'tktb:reinit-confirme');
    assert.ok(oui, 'aucun menu de confirmation');
    const avant = JSON.stringify(store.getGuild(G).bouton);
    it = inter('tktb:reinit-confirme', { guild: g, values: ['non'] });
    await h.handleSelectMenu(it);
    assert.equal(JSON.stringify(store.getGuild(G).bouton), avant, '« Non » a modifié les réglages !');
    assert.match(txt(it.out), /annulée/i);
  });

  await test('« Oui » remet le système BOUTON à zéro sans toucher au MENU', async () => {
    store.setGuild(G, {
      panelMode: 'menu', categoryId: 'CAT-MENU', staffRoleIds: ['ROLE-MENU'], logChannelId: 'LOG-MENU',
      panelChannelId: 'PAN-MENU', panelMessageId: 'MSG-MENU',
      panel: { titre: 'Panneau MENU', description: 'Texte du MENU', selecteur: 'x', image: 'y' },
      types: [{ id: 't1' }],
    });
    it = inter('tktb:reinit-confirme', { guild: g, values: ['oui'] });
    await h.handleSelectMenu(it);
    const b = store.getGuild(G).bouton;
    assert.equal(b.items.length, 0, 'les boutons n\'ont pas été effacés');
    assert.equal(b.panelChannelId, null, 'le salon du panneau n\'a pas été effacé');
    assert.equal(b.configure, false, 'le panneau est encore marqué configuré');
    const d = store.getGuild(G);
    assert.equal(d.panelChannelId, 'PAN-MENU', 'le salon du MENU a été touché !');
    assert.equal(d.panelMessageId, 'MSG-MENU', 'le panneau du MENU a été touché !');
    assert.equal(d.panel.titre, 'Panneau MENU', 'le titre du MENU a été touché !');
    assert.equal(d.types.length, 1, 'les types du MENU ont été touchés !');
  });

  await test('après réinitialisation, un nouvel assistant repart proprement de zéro', async () => {
    const it2 = inter('x', { guild: g });
    await h.configBouton(it2);
    assert.match(txt(it2.out), /1\/6/);
    assert.match(txt(it2.out), /pas encore choisi/);
  });

  await test('aucune route de l\'assistant ne répond « inconnu »', async () => {
    const routes = ['tktb:etape:1', 'tktb:etape:5', 'tktb:publier', 'tktb:reinit'];
    for (const r of routes) {
      const i3 = inter(r, { guild: g });
      await h.handleButton(i3);
      assert.ok(!/expir|inconnu/i.test(txt(i3.out)), 'route non reconnue : ' + r);
    }
    const menus = ['tktb:items', 'tktb:items-suppr'];
    for (const m of menus) {
      const i3 = inter(m, { guild: g, values: ['inesistant'] });
      await h.handleSelectMenu(i3);
      assert.ok(i3.out, 'menu muet : ' + m);
    }
  });

  console.log(`\n${ok} étapes du parcours OK${ko ? ` — ÉCHEC de ${ko}` : ' ✅'}`);
  process.exit(ko ? 1 : 0);
})();
