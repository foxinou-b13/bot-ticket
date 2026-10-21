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

  await test('carte du ticket : boutons essentiels présents', () => {
    const t = { numero: 1, userId: 'u1', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now(), sujet: 'test', typeNom: 'Bug', typeEmoji: '🔴' };
    const c = h.carteTicket(t).toJSON();
    const boutons = c.components[c.components.length - 1].components;
    const ids = boutons.map(b => b.custom_id);
    if (!ids.includes('ticket:reclamer')) throw new Error('bouton prise en charge absent');
    if (!ids.includes('ticket:ajouter-membre')) throw new Error('bouton ajouter un membre absent');
    if (!ids.includes('ticket:fermer')) throw new Error('bouton fermer absent');
    if (boutons.length < 3) throw new Error('nombre de boutons : ' + boutons.length);
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

  await test('la carte du ticket a 5 boutons (dont retirer un membre et renommer)', () => {
    const t = { numero: 1, userId: 'u1', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now() };
    const c = h.carteTicket(t).toJSON();
    const boutons = c.components[c.components.length - 1].components;
    const ids = boutons.map(b => b.custom_id);
    for (const attendu of ['ticket:reclamer', 'ticket:ajouter-membre', 'ticket:retirer-membre', 'ticket:renommer', 'ticket:fermer']) {
      if (!ids.includes(attendu)) throw new Error('bouton manquant : ' + attendu);
    }
    if (boutons.length > 5) throw new Error('Discord limite à 5 boutons par rangée : ' + boutons.length);
  });

  await test('retirer un membre : le menu ne propose QUE les membres ajoutés', async () => {
    reset();
    store.addTicket(G, 'c-ticket-test', { numero: 5, userId: 'u-auteur', staffRoleIds: ['role-staff'], claimedBy: null, createdAt: Date.now(), membres: ['u-ajoute-1', 'u-ajoute-2'] });
    let rep = null;
    await h.handleButton({
      customId: 'ticket:retirer-membre', guild: { id: G, members: { fetch: async () => null } },
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
    await h.handleButton({
      customId: 'ticket:retirer-membre', guild: { id: G, members: { fetch: async () => null } },
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
    await h.handleButton({
      customId: 'ticket:retirer-membre', guild: { id: G },
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
    await h.handleButton({
      customId: 'ticket:renommer', guild: { id: G },
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

  console.log(`\n${ok} tests de régression OK ${process.exitCode ? '— ÉCHEC' : '✅'}`);
})();
