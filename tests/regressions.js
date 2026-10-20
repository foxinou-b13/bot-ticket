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

  await test('erreur → carte avec ligne de couleur à gauche (accent rouge)', () => {
    const p = payload({ couleur: 'erreur', texte: '❌ test' });
    const j = p.components[0].toJSON();
    if (j.type !== 17) throw new Error('pas un conteneur (type ' + j.type + ')');
    if (j.accent_color !== 0xed4245) throw new Error('accent incorrect : ' + j.accent_color);
    if (!(p.flags & 32768)) throw new Error('flag components v2 absent');
  });

  await test('succès / info / avertissement → couleurs distinctes', () => {
    const couleurs = {
      succes: payload({ couleur: 'succes', texte: 'ok' }).components[0].toJSON().accent_color,
      info: payload({ couleur: 'info', texte: 'info' }).components[0].toJSON().accent_color,
      attention: payload({ couleur: 'attention', texte: '!' }).components[0].toJSON().accent_color,
    };
    const uniques = new Set(Object.values(couleurs));
    if (uniques.size !== 3) throw new Error('couleurs identiques : ' + JSON.stringify(couleurs));
  });

  await test('les erreurs du ticket sont déduites en rouge automatiquement', () => {
    const j = payload({ texte: '❌ Tu dois avoir la permission « Gérer le serveur ».' }).components[0].toJSON();
    if (j.accent_color !== 0xed4245) throw new Error('couleur automatique incorrecte');
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

  console.log(`\n${ok} tests de régression OK ${process.exitCode ? '— ÉCHEC' : '✅'}`);
})();
