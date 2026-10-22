/**
 * tests/regressions.js — les deux bugs signalés le 20/10 :
 *
 *  1. « Tu as déjà un ticket ouvert : #salon » alors que ce salon n'existait
 *     plus (lien inaccessible) → ticket fantôme qui bloquait le membre.
 *  2. Le bot se créait une catégorie (et un salon de logs) en double, et une
 *     configuration pointant vers des salons supprimés n'était jamais réparée.
 *
 *  + vérification que TOUTES les réponses sont des cartes arrondies avec une
 *    ligne de couleur à gauche (accent_color).
 */
const { Collection } = require('discord.js');
const store = require('../utils/store');
const h = require('../handlers/ticketHandler');
const cmdTicket = require('../commands/ticket');
const { payload } = require('../utils/panneaux');
store.charger();

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

const G = 'g-regression';
function reset() {
  const g = store.getGuild(G);
  for (const c of Object.keys(g.open || {})) store.removeTicket(G, c);
  store.setGuild(G, {
    categoryId: 'cat-mort',
    logChannelId: 'log-mort',
    panelChannelId: 'pan-mort',
    panelMessageId: null,
    staffRoleIds: ['role-staff'],
    panelMode: 'menu',
    panel: { titre: null, description: null, selecteur: null, image: null },
    types: [{ id: 't1', nom: 'Bug', emoji: '🔴', description: null, categoryId: null, staffRoleIds: ['role-staff'] }],
  });
}

// ─── Faux serveur ───
function monde(opts = {}) {
  const crees = [];
  const salons = new Map();
  const guild = {
    id: G,
    name: 'Serveur Régressions',
    roles: { everyone: { id: 'every' } },
    members: { me: { id: 'bot-1', permissions: { has: () => true } }, fetch: async () => null },
    channels: {
      cache: new Collection(),
      fetch: async id => {
        if (opts.morts && opts.morts.includes(id)) return null;
        return salons.get(id) || null;
      },
      create: async o => {
        const c = {
          id: 'cree-' + (crees.length + 1),
          name: o.name,
          type: o.type,
          parentId: o.parent,
          setParent: async () => c,
          permissionOverwrites: { edit: async () => {} },
          send: async () => ({ id: 'm-' + (crees.length + 1), pin: async () => {} }),
          messages: { fetch: async () => ({}) },
        };
        crees.push(c);
        salons.set(c.id, c);
        guild.channels.cache.set(c.id, c);
        return c;
      },
    },
  };
  return { guild, crees, salons };
}

(async () => {
  console.log('── Bug 1 : ticket fantôme —─');

  await test('salon supprimé → le membre peut rouvrir un ticket (pas de blocage)', async () => {
    reset();
    // Ticket enregistré dont le salon a été supprimé côté Discord
    store.addTicket(G, 'salon-disparu', {
      numero: 3, userId: 'u-ghost', sujet: 'test', staffRoleIds: ['role-staff'],
      claimedBy: null, createdAt: Date.now(), messageId: 'm-3',
    });
    const { guild } = monde({ morts: ['salon-disparu'] });
    // Le salon n'existe plus : il doit être purgé automatiquement
    const reel = await h.ticketOuvertReel(guild, 'u-ghost');
    if (reel) throw new Error('un ticket fantôme est encore considéré comme ouvert');
    if (store.findTicketByUser(G, 'u-ghost')) throw new Error('enregistrement fantôme non supprimé');
  });

  await test('salon réellement ouvert → le membre est bien bloqué (comportement voulu)', async () => {
    reset();
    const { guild, salons } = monde();
    const salon = {
      id: 'salon-vivant', parentId: 'cat-mort', type: 0,
      permissionOverwrites: { edit: async () => {} },
      permissionsFor: () => ({ has: () => true }),
    };
    salons.set('salon-vivant', salon);
    store.addTicket(G, 'salon-vivant', {
      numero: 4, userId: 'u-vivant', sujet: 'test', staffRoleIds: ['role-staff'],
      claimedBy: null, createdAt: Date.now(), messageId: 'm-4',
    });
    const reel = await h.ticketOuvertReel(guild, 'u-vivant');
    if (!reel || !reel.salon) throw new Error('le ticket valide devrait être renvoyé');
  });

  await test('purgerTicketsFantomes supprime uniquement les salons morts', async () => {
    reset();
    const { guild, salons } = monde({ morts: ['mort-1'] });
    salons.set('vivant-1', {
      id: 'vivant-1', permissionOverwrites: { edit: async () => {} },
      permissionsFor: () => ({ has: () => true }),
    });
    store.addTicket(G, 'mort-1', { numero: 1, userId: 'a', staffRoleIds: [], claimedBy: null, createdAt: 1 });
    store.addTicket(G, 'vivant-1', { numero: 2, userId: 'b', staffRoleIds: [], claimedBy: null, createdAt: 1 });
    const r = await h.purgerTicketsFantomes(guild, { verifierAcces: true });
    if (r.purges !== 1) throw new Error('purges = ' + r.purges + ' (attendu 1)');
    if (!store.getTicket(G, 'vivant-1')) throw new Error('un ticket valide a été supprimé');
  });

  console.log('── Bug 2 : catégories / salons en double ──');

  await test('configuration morte → réparation sans doublon (1 catégorie, 1 log, 1 panneau)', async () => {
    reset();
    const { guild, crees } = monde({ morts: ['cat-mort', 'log-mort', 'pan-mort'] });
    const infra = await h.preparerInfra(guild);
    if (crees.length !== 3) throw new Error(crees.length + ' salons créés au lieu de 3 : ' + crees.map(c => c.name).join(', '));
    if (!crees.some(c => c.name.includes('Tickets'))) throw new Error('catégorie non créée');
    if (!crees.some(c => c.name.includes('logs'))) throw new Error('salon de logs non créé');
    const cfg = store.getGuild(G);
    if (cfg.categoryId !== infra.categoryId) throw new Error('config non enregistrée');
    if (infra.recrees.length !== 3) throw new Error('récapitulatif de réparation incomplet');
  });

  await test('deuxième passage → AUCUNE création supplémentaire (idempotent)', async () => {
    const { guild, crees } = monde();
    // On repart de la config réparée au test précédent, mais avec les salons connus
    const cfg = store.getGuild(G);
    const existants = new Collection();
    const cat = { id: cfg.categoryId, type: 4, name: '🎫 Tickets' };
    const log = { id: cfg.logChannelId, type: 0, name: '🔒・logs-tickets', parentId: cfg.categoryId };
    const pan = { id: cfg.panelChannelId, type: 0, name: 'ouvrir-un-ticket', parentId: cfg.categoryId };
    for (const c of [cat, log, pan]) { existants.set(c.id, c); guild.channels.cache.set(c.id, c); }
    guild.channels.fetch = async id => existants.get(id) || null;
    const infra = await h.preparerInfra(guild);
    if (crees.length !== 0) throw new Error('doublons créés : ' + crees.map(c => c.name).join(', '));
    if (infra.recrees.length !== 0) throw new Error('réparation annoncée alors que tout existait');
  });

  await test('catégorie de tickets déjà présente sur le serveur → réutilisée, pas recréée', async () => {
    reset();
    store.setGuild(G, { categoryId: null, logChannelId: null, panelChannelId: null });
    const { guild, crees } = monde();
    const existante = { id: 'cat-existante', name: '🎫 TICKETS', type: 4 };
    guild.channels.cache.set(existante.id, existante);
    guild.channels.fetch = async () => null;
    const infra = await h.preparerInfra(guild);
    if (infra.categoryId !== 'cat-existante') throw new Error("la catégorie existante n'a pas été réutilisée");
    if (crees.some(c => c.type === 4)) throw new Error('une deuxième catégorie a été créée');
  });

  console.log('── Réponses en cartes arrondies ──');

  await test('carte = conteneur arrondi SANS ligne colorée à gauche', () => {
    const p = payload({ couleur: 'erreur', texte: '❌ test' });
    const j = p.components[0].toJSON();
    if (j.type !== 17) throw new Error('pas un conteneur (type ' + j.type + ')');
    if (j.accent_color !== undefined && j.accent_color !== null) throw new Error('ligne colorée présente : ' + j.accent_color);
    if (!(p.flags & 32768)) throw new Error('flag components v2 absent');
  });

  await test('aucune carte (succès / info / attention / erreur) n\'a d\'accent', () => {
    for (const couleur of ['succes', 'info', 'attention', 'erreur']) {
      const j = payload({ couleur, texte: 'x' }).components[0].toJSON();
      if (j.accent_color) throw new Error('accent présent pour ' + couleur + ' : ' + j.accent_color);
    }
  });

  await test('/ticket reparer : répond et répare', async () => {
    reset();
    let rep = null;
    const { guild } = monde({ morts: ['cat-mort', 'log-mort', 'pan-mort'] });
    const inter = {
      guild,
      member: { permissions: { has: () => true } },
      user: { id: 'u-admin' },
      options: { getSubcommand: () => 'reparer' },
      deferReply: async () => {},
      reply: r => { rep = r; },
      editReply: r => { rep = r; },
      followUp: r => { rep = r; },
    };
    await cmdTicket.execute(inter);
    if (!rep || !rep.components) throw new Error('aucune réponse');
    const texte = JSON.stringify(rep.components);
    if (!texte.includes('vérifié')) throw new Error('récapitulatif absent');
  });


  console.log('── Ticket : boutons, fermeture staff, confirmation ──');

  await test('carte du ticket : bouton prise en charge présent', () => {
    const t = { numero: 1, userId: 'u1', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now(), sujet: 'test', typeNom: 'Bug', typeEmoji: '🔴' };
    const c = h.carteTicket(t).toJSON();
    const ids = c.components.filter(x => x.type === 1).flatMap(r => r.components.map(b => b.custom_id));
    if (!ids.includes('ticket:reclamer')) throw new Error('bouton prise en charge absent');
    if (!ids.includes('ticket:actions')) throw new Error('menu unique absent');
  });

  await test('carte du ticket : aucune ligne colorée (pas d\'accent)', () => {
    const t = { numero: 1, userId: 'u1', staffRoleIds: [], claimedBy: null, createdAt: Date.now() };
    const c = h.carteTicket(t).toJSON();
    if (c.accent_color) throw new Error('ligne colorée présente');
    if (c.type !== 17) throw new Error('pas une carte arrondie');
  });

  await test('fermer le ticket : refusé pour un membre qui n\'est pas du staff', async () => {
    reset();
    store.addTicket(G, 'c-ticket-test', { numero: 9, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now() });
    let rep = null;
    const inter = {
      customId: 'ticket:fermer',
      guild: { id: G },
      member: { permissions: { has: () => true }, roles: { cache: new Map([['role-autre', 1]]) } },
      user: { id: 'u-auteur' },
      channel: { id: 'c-ticket-test' },
      reply: r => { rep = r; }, followUp: r => { rep = r; }, update: r => { rep = r; },
      showModal: () => { throw new Error('un non-staff a pu ouvrir le formulaire de fermeture'); },
    };
    await h.handleButton(inter);
    if (!rep) throw new Error('aucune réponse');
    const txt = JSON.stringify(rep.components);
    if (!txt.includes('réservée au staff')) throw new Error('refus non expliqué : ' + txt.slice(0, 150));
  });

  await test('fermer le ticket : autorisé pour le staff (formulaire de raison)', async () => {
    reset();
    store.addTicket(G, 'c-ticket-test', { numero: 9, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now() });
    let modal = null;
    const inter = {
      customId: 'ticket:fermer',
      guild: { id: G },
      member: { permissions: { has: () => true }, roles: { cache: new Map([['role-staff', 1]]) } },
      user: { id: 'u-staff' },
      channel: { id: 'c-ticket-test' },
      showModal: m => { modal = m; },
    };
    await h.handleButton(inter);
    if (!modal) throw new Error('formulaire non affiché');
    if (modal.toJSON().custom_id !== 'ticket:raison-fermeture') throw new Error('mauvais formulaire');
  });

  await test('après la raison → CARTE de confirmation avec Confirmer et Annuler', async () => {
    reset();
    store.addTicket(G, 'c-ticket-test', { numero: 9, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now() });
    let rep = null;
    const inter = {
      customId: 'ticket:raison-fermeture',
      guild: { id: G },
      member: { permissions: { has: () => true }, roles: { cache: new Map([['role-staff', 1]]) } },
      user: { id: 'u-staff' },
      channel: { id: 'c-ticket-test' },
      message: { components: [] },
      fields: { getTextInputValue: () => 'Problème réglé' },
      reply: r => { rep = r; }, followUp: r => { rep = r; },
    };
    await h.handleModal(inter);
    if (!rep) throw new Error('aucune réponse');
    const txt = JSON.stringify(rep.components);
    if (!txt.includes('Confirmer')) throw new Error('bouton confirmer absent');
    if (!txt.includes('Annuler')) throw new Error('bouton annuler absent');
    if (!txt.includes('Problème réglé')) throw new Error('raison absente de la carte');
    if (txt.includes('supprimé dans 5 secondes')) throw new Error('le ticket a été fermé sans confirmation');
  });

  await test('bouton Annuler → ticket toujours ouvert', async () => {
    reset();
    store.addTicket(G, 'c-ticket-test', { numero: 9, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now() });
    let rep = null;
    const inter = {
      customId: 'ticket:annuler-fermeture', guild: { id: G },
      member: { permissions: { has: () => true }, roles: { cache: new Map([['role-staff', 1]]) } },
      user: { id: 'u-staff' }, channel: { id: 'c-ticket-test' },
      update: r => { rep = r; }, reply: r => { rep = r; },
    };
    await h.handleButton(inter);
    if (!rep) throw new Error('aucune réponse');
    if (!JSON.stringify(rep.components).includes('annulée')) throw new Error('confirmation d\'annulation absente');
    if (!store.getTicket(G, 'c-ticket-test')) throw new Error('le ticket a été supprimé alors qu\'on annulait');
  });

  await test('bouton Ajouter un membre : refusé hors staff, proposé au staff', async () => {
    reset();
    store.addTicket(G, 'c-ticket-test', { numero: 9, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now() });
    let rep = null;
    const base = { customId: 'ticket:ajouter-membre', guild: { id: G }, user: { id: 'x' }, channel: { id: 'c-ticket-test' }, reply: r => { rep = r; }, update: r => { rep = r; }, followUp: r => { rep = r; } };
    await h.handleButton({ ...base, member: { permissions: { has: () => true }, roles: { cache: new Map([['role-autre', 1]]) } } });
    if (!JSON.stringify(rep.components).includes('staff')) throw new Error('refus non staff absent');
    rep = null;
    await h.handleButton({ ...base, member: { permissions: { has: () => true }, roles: { cache: new Map([['role-staff', 1]]) } } });
    if (!JSON.stringify(rep.components || []).includes('membre-choix')) throw new Error('sélecteur de membres absent');
  });


  console.log('── Membres du ticket : ajout, retrait, renommage ──');

  await test('carte du ticket : 1 bouton (Prendre en charge) + 1 menu unique', () => {
    const t = { numero: 1, userId: 'u1', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now() };
    const c = h.carteTicket(t).toJSON();
    const rangees = c.components.filter(x => x.type === 1);
    if (rangees.length !== 2) throw new Error('rangées d\'action : ' + rangees.length);
    const boutons = rangees[0].components;
    if (boutons.length !== 1 || boutons[0].custom_id !== 'ticket:reclamer') throw new Error('le bouton « Prendre en charge » doit être seul');
    const menu = rangees[1].components[0];
    if (menu.type !== 3 || menu.custom_id !== 'ticket:actions') throw new Error('menu unique absent');
    const valeurs = menu.options.map(o => o.value);
    for (const v of ['ajouter', 'retirer', 'renommer', 'fermer']) {
      if (!valeurs.includes(v)) throw new Error('option manquante : ' + v);
    }
  });

  await test('retirer un membre : le menu ne propose QUE les membres ajoutés', async () => {
    reset();
    store.addTicket(G, 'c-ticket-test', { numero: 5, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now(), membres: ['u-ajoute-1', 'u-ajoute-2'] });
    let rep = null;
    await h.handleSelectMenu({
      customId: 'ticket:actions', guild: { id: G, members: { fetch: async () => null } }, values: ['retirer'],
      member: { permissions: { has: () => true }, roles: { cache: new Map([['role-staff', 1]]) } },
      user: { id: 'u-staff' }, channel: { id: 'c-ticket-test' },
      reply: r => { rep = r; }, followUp: r => { rep = r; }, update: r => { rep = r; },
    });
    const j = JSON.stringify(rep);
    if (!j.includes('ticket:membre-retirer')) throw new Error('menu de retrait absent');
    if (!j.includes('u-ajoute-1') || !j.includes('u-ajoute-2')) throw new Error('membres ajoutés absents du menu');
    if (j.includes('u-auteur')) throw new Error('le créateur est proposé alors qu\'il ne doit pas l\'être');
  });

  await test('retirer un membre : aucun membre ajouté → message clair', async () => {
    reset();
    store.addTicket(G, 'c-ticket-test', { numero: 5, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now(), membres: [] });
    let rep = null;
    await h.handleSelectMenu({
      customId: 'ticket:actions', guild: { id: G, members: { fetch: async () => null } }, values: ['retirer'],
      member: { permissions: { has: () => true }, roles: { cache: new Map([['role-staff', 1]]) } },
      user: { id: 'u-staff' }, channel: { id: 'c-ticket-test' },
      reply: r => { rep = r; }, followUp: r => { rep = r; },
    });
    if (!JSON.stringify(rep).includes('Aucun membre')) throw new Error('message absent');
  });

  await test('retrait effectif : permission supprimée + liste mise à jour', async () => {
    reset();
    store.addTicket(G, 'c-ticket-test', { numero: 5, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now(), membres: ['u-1', 'u-2'] });
    const supprimes = [];
    let rep = null;
    const channel = {
      id: 'c-ticket-test',
      permissionOverwrites: { delete: async id => { supprimes.push(id); } },
      send: async () => ({}),
    };
    await h.handleSelectMenu({
      customId: 'ticket:membre-retirer', guild: { id: G }, channel,
      member: { permissions: { has: () => true }, roles: { cache: new Map([['role-staff', 1]]) } },
      user: { id: 'u-staff' }, values: ['u-1'],
      update: r => { rep = r; }, reply: r => { rep = r; }, followUp: r => { rep = r; },
    });
    if (supprimes.length !== 1 || supprimes[0] !== 'u-1') throw new Error('permission non retirée : ' + supprimes.join(','));
    const t = store.getTicket(G, 'c-ticket-test');
    if (t.membres.includes('u-1')) throw new Error('liste des membres non mise à jour');
    if (!t.membres.includes('u-2')) throw new Error('un autre membre a été retiré par erreur');
  });

  await test('retrait refusé à un non-staff', async () => {
    reset();
    store.addTicket(G, 'c-ticket-test', { numero: 5, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now(), membres: ['u-1'] });
    let rep = null;
    await h.handleSelectMenu({
      customId: 'ticket:actions', guild: { id: G }, values: ['retirer'],
      member: { permissions: { has: () => true }, roles: { cache: new Map([['role-autre', 1]]) } },
      user: { id: 'x' }, channel: { id: 'c-ticket-test' },
      reply: r => { rep = r; }, update: r => { rep = r; }, followUp: r => { rep = r; },
    });
    if (!JSON.stringify(rep).includes('staff')) throw new Error('refus absent');
  });

  await test('renommer : formulaire ouvert pour le staff', async () => {
    reset();
    store.addTicket(G, 'c-ticket-test', { numero: 5, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now() });
    let modal = null;
    await h.handleSelectMenu({
      customId: 'ticket:actions', guild: { id: G }, values: ['renommer'],
      member: { permissions: { has: () => true }, roles: { cache: new Map([['role-staff', 1]]) } },
      user: { id: 'u-staff' }, channel: { id: 'c-ticket-test' },
      showModal: m => { modal = m; },
    });
    if (!modal) throw new Error('formulaire absent');
    if (modal.toJSON().custom_id !== 'ticket:renommer-modal') throw new Error('mauvais formulaire');
  });

  await test('renommer : le salon est renommé ticket-5-mon-sujet', async () => {
    reset();
    store.addTicket(G, 'c-ticket-test', { numero: 5, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now() });
    let nouveauNom = null; let rep = null;
    const channel = { id: 'c-ticket-test', setName: async n => { nouveauNom = n; }, send: async () => ({}) };
    await h.handleModal({
      customId: 'ticket:renommer-modal', guild: { id: G }, channel,
      member: { permissions: { has: () => true }, roles: { cache: new Map([['role-staff', 1]]) } },
      user: { id: 'u-staff' },
      fields: { getTextInputValue: () => 'Mon Sujet !' },
      reply: r => { rep = r; }, followUp: r => { rep = r; },
    });
    if (nouveauNom !== 'ticket-5-mon-sujet') throw new Error('nom obtenu : ' + nouveauNom);
    if (!JSON.stringify(rep).includes('renommé')) throw new Error('confirmation absente');
  });


  console.log('── Mise à jour des anciennes cartes de ticket ──');

  await test('les anciennes cartes sont remplacées par la nouvelle disposition', async () => {
    reset();
    store.addTicket(G, 'c-ancien', { numero: 8, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now(), messageId: 'm-ancien' });
    let edition = null;
    const message = { id: 'm-ancien', edit: async p => { edition = p; return message; } };
    const salon = { id: 'c-ancien', messages: { fetch: async () => message } };
    const guild = { id: G, channels: { fetch: async () => salon } };
    const r = await h.rafraichirCartesTickets(guild);
    if (r.misAJour !== 1) throw new Error('cartes mises à jour : ' + r.misAJour);
    const j = JSON.stringify(edition.components);
    if (!j.includes('ticket:reclamer')) throw new Error('bouton prise en charge absent');
    if (!j.includes('ticket:actions')) throw new Error('menu unique absent');
    if (j.includes('ticket:ajouter-membre') || j.includes('ticket:fermer')) {
      throw new Error('anciens boutons encore présents');
    }
    if (edition.embeds && edition.embeds.length) throw new Error('ancien embed encore présent');
  });

  await test('un ticket dont le message a disparu est ignoré (pas de crash)', async () => {
    reset();
    store.addTicket(G, 'c-perdu', { numero: 9, userId: 'u', staffRoleIds: [], claimedBy: null, createdAt: Date.now(), messageId: 'm-x' });
    const guild = { id: G, channels: { fetch: async () => null } };
    const r = await h.rafraichirCartesTickets(guild);
    if (r.misAJour !== 0) throw new Error('aucune carte ne devait être mise à jour');
  });


  console.log('── Raison de l\'ouverture en backticks ──');

  await test('la raison apparaît entre backticks dans la carte du ticket', () => {
    const t = { numero: 3, userId: 'u1', staffRoleIds: [], claimedBy: null, createdAt: Date.now(), sujet: 'Mon souci de connexion' };
    const texte = h.carteTicket(t).toJSON().components.filter(c => c.type === 10).map(c => c.content).join('\n');
    if (!texte.includes('```\nMon souci de connexion\n```')) throw new Error('bloc de code absent : ' + texte);
    if (texte.includes("de l'ouverture")) throw new Error('« de l\'ouverture » devrait être retiré');
    if (!/\*\*Raison\*\* :/.test(texte)) throw new Error('libellé « Raison : » absent : ' + texte);
  });

  await test('un backtick saisi par le membre ne casse pas le format', () => {
    const t = { numero: 3, userId: 'u1', staffRoleIds: [], claimedBy: null, createdAt: Date.now(), sujet: 'test ` pirate' };
    const texte = h.carteTicket(t).toJSON().components.filter(c => c.type === 10).map(c => c.content).join('\n');
    const nb = (texte.match(/```/g) || []).length;
    if (nb !== 2) throw new Error('blocs de code mal fermés (' + nb + ' triples backticks) : ' + texte);
    if (texte.includes('pirate\n```\n```')) throw new Error('bloc cassé par la saisie du membre');
  });


  await test('raison multi-lignes conservée dans le bloc de code', () => {
    const t = { numero: 3, userId: 'u1', staffRoleIds: [], claimedBy: null, createdAt: Date.now(),
      sujet: "Bonsoir\n\nJ'ai mon bot ticket à vendre si ça vous intéresse." };
    const texte = h.carteTicket(t).toJSON().components.filter(c => c.type === 10).map(c => c.content).join('\n');
    if (!texte.includes('```\nBonsoir\n\n')) throw new Error('ligne vide perdue : ' + texte);
    if ((texte.match(/```/g) || []).length !== 2) throw new Error('bloc mal fermé');
  });

  await test('le formulaire d\'ouverture accepte plusieurs lignes (Paragraph, 400 car.)', () => {
    // Vérifie la définition réelle du champ dans le code
    const source = require('fs').readFileSync(require('path').join(__dirname, '..', 'handlers', 'ticketHandler.js'), 'utf8');
    const blocs = source.split("setCustomId('sujet')").slice(1);
    if (!blocs.length) throw new Error('champ sujet introuvable');
    for (const bloc of blocs) {
      const morceau = bloc.slice(0, 260);
      if (!morceau.includes('TextInputStyle.Paragraph')) throw new Error('champ non multi-lignes : ' + morceau.slice(0, 120));
      if (!morceau.includes('setMaxLength(400)')) throw new Error('limite de 400 caractères absente');
    }
  });


  await test('la carte n\'a plus de ligne « Utilise les boutons ci-dessous »', () => {
    const t = { numero: 3, userId: 'u1', staffRoleIds: [], claimedBy: null, createdAt: Date.now(), sujet: 'x' };
    const texte = h.carteTicket(t).toJSON().components.filter(c => c.type === 10).map(c => c.content).join('\n');
    if (/Utilise les boutons/i.test(texte)) throw new Error('ligne de pied encore présente');
    if (/ouvert le/i.test(texte)) throw new Error('date de pied encore présente');
  });

  await test('le bouton affiche toujours « Pris en charge »', () => {
    for (const claimedBy of [null, 'u9']) {
      const t = { numero: 3, userId: 'u1', staffRoleIds: [], claimedBy, createdAt: Date.now(), sujet: 'x' };
      const row = h.carteTicket(t).toJSON().components.find(c => c.type === 1);
      const btn = row.components.find(b => b.type === 2);
      if (btn.label !== 'Pris en charge') throw new Error('libellé = ' + btn.label);
      if (!!btn.disabled !== !!claimedBy) throw new Error('état désactivé incohérent');
    }
  });


  await test('emojis : repli automatique sur l\'emoji classique si non installé', () => {
    const e = require('../utils/emojis');
    if (e.NOMS.length !== 50) throw new Error('catalogue incomplet : ' + e.NOMS.length);
    for (const nom of e.NOMS) {
      const valeur = e.ej('serveur-inconnu', nom);
      if (!valeur) throw new Error('aucun secours pour ' + nom);
      const objet = e.emojiPour('serveur-inconnu', nom);
      if (typeof objet === 'string' && !objet) throw new Error('emojiPour vide pour ' + nom);
    }
  });

  await test('emojis : chaque image du catalogue existe dans assets', () => {
    const fs = require('fs');
    const path = require('path');
    const e = require('../utils/emojis');
    const dossier = path.join(__dirname, '..', 'assets', 'emojis');
    const manquants = e.NOMS.filter(n => !fs.existsSync(path.join(dossier, n + '.png')));
    if (manquants.length) throw new Error('images manquantes : ' + manquants.join(', '));
  });


  await test('emojis : la surveillance et le déclenchement à la place libre existent', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.js'), 'utf8');
    if (!/Events\.GuildEmojiDelete/.test(src)) throw new Error('pas de surveillance de suppression d\'emoji');
    if (!/function completerEmojis/.test(src)) throw new Error('pas de fonction de complétion');
    if (!/15 \* 60 \* 1000/.test(src)) throw new Error('pas de revérification périodique');
  });

  await test('emojis : le bot retombe sur les emojis normaux quand les siens manquent', () => {
    const e = require('../utils/emojis');
    const valeur = e.ej('serveur-sans-emojis', 'oa_billet');
    if (valeur !== '🎫') throw new Error('repli incorrect : ' + valeur);
    const pour = e.emojiPour('serveur-sans-emojis', 'oa_fermer');
    if (pour !== '🔒') throw new Error('repli bouton incorrect : ' + JSON.stringify(pour));
  });


  await test('fermeture : les deux phrases retirées, les panneaux conservés', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'handlers', 'ticketHandler.js'), 'utf8');
    // les deux textes à retirer ne doivent plus être affichés
    if (/texte: 'Le salon sera supprimé dans quelques secondes\.'/.test(src)) throw new Error('phrase « quelques secondes » encore affichée');
    if (/titre: '🔒 Fermeture du ticket'/.test(src)) throw new Error('titre « Fermeture du ticket » encore affiché');
    // mais les panneaux doivent rester
    if (!/titre: '🔒 Fermeture en cours…'/.test(src)) throw new Error('panneau « Fermeture en cours… » manquant');
    if (!/Ce salon sera supprimé dans 5 secondes/.test(src)) throw new Error('message du salon manquant');
  });

  console.log(`\n${ok} tests de régression OK ${process.exitCode ? '— ÉCHEC' : '✅'}`);
})();
