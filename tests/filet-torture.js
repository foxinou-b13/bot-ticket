/**
 * tests/filet-torture.js — LA PREUVE PAR LE TEMPS, pas par la lecture du code.
 *
 * Chaque appel Discord (répondre, créer un salon, éditer, envoyer) est ralenti
 * à 2,2 s — pire que le réel. Sur chaque commande, bouton, menu, formulaire,
 * on mesure le délai de la PREMIÈRE tentative d'accusé de réception.
 * Au-delà de 3 s, Discord affiche « L'application n'a pas répondu à temps » :
 * ce test dénonce tout chemin qui ferait ça.
 *
 * La séquence reproduit index.js : filet posé avant tout, handler, puis
 * garde-fou « toute interaction reçoit une réponse ».
 */
const store = require('../utils/store');
const h = require('../handlers/ticketHandler');
const cmdTicket = require('../commands/ticket');
const { repondre, filetDeSecurite } = require('../utils/panneaux');

store.charger();
const G = 'g-torture';
store.setGuild(G, {
  categoryId: 'cat-t',
  logChannelId: 'log-t',
  panelChannelId: 'pan-t',
  staffRoleIds: ['role-staff'],
  panelMode: 'menu',
  types: [{ id: 't1', nom: 'Bug', emoji: '🔴', description: null, categoryId: null, staffRoleIds: ['role-staff'] }],
});
store.addTicket(G, 'c-tick', { numero: 8, userId: 'u-owner', sujet: 'S', typeId: 't1', typeNom: 'Bug', createdAt: Date.now(), messageId: 'm-tick' });

const LENTEUR = 2200;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let rejections = 0;
process.on('unhandledRejection', () => { rejections += 1; });

function interTorture(t0, over = {}) {
  const cap = { premier: null };
  const marquer = () => { if (cap.premier === null) cap.premier = Date.now() - t0; };
  const canal = {
    id: 'c-tick', name: 'ticket-8',
    send: async () => { await sleep(LENTEUR); return { id: 'm-x', pin: async () => {}, delete: async () => {} }; },
    delete: async () => sleep(LENTEUR),
    edit: async () => { await sleep(LENTEUR); return canal; },
    setTopic: async () => sleep(LENTEUR),
    permissionOverwrites: { edit: async () => sleep(LENTEUR), delete: async () => sleep(LENTEUR) },
    messages: { fetch: async () => ({ filter: () => new Map(), find: () => null, size: 0 }) },
  };
  const guild = {
    id: G, name: 'Serveur Torture',
    roles: { everyone: { id: 'every' }, cache: new Map([['role-staff', { id: 'role-staff', name: 'Staff' }]]) },
    members: { me: { id: 'bot-1' }, fetch: async () => ({ id: 'u-cible', user: { username: 'Cible', bot: false }, roles: { add: async () => {} } }) },
    channels: {
      fetch: async () => canal,
      create: async () => { await sleep(LENTEUR); return canal; },
      cache: new Map([['c-tick', canal]]),
    },
  };
  const inter = {
    guild, guildId: G, channelId: 'c-tick', channel: canal,
    member: over.member || { permissions: { has: () => true }, roles: { cache: new Set(['role-staff']) } },
    user: { id: over.userId || 'u-admin', username: 'Admin', bot: false, tag: 'Admin#0001' },
    client: { user: { id: 'bot-1' }, users: { fetch: async () => ({ send: async () => {} }) } },
    replied: false, deferred: false,
    isButton: () => !!over.customId && !over.fields && !over.kind,
    isStringSelectMenu: () => over.kind === 'select',
    isAnySelectMenu: () => over.kind === 'select',
    isModalSubmit: () => !!over.fields,
    isChatInputCommand: () => !!over.options,
    customId: over.customId,
    values: over.values || [],
    fields: over.fields,
    options: over.options,
    commandName: 'ticket',
    isRepliable: () => true, // discord.js : la vraie méthode — le filet l'exige avant de parler
    message: { id: 'm-tick', edit: async () => { await sleep(LENTEUR); return inter.message; } },
    showModal: async () => { marquer(); await sleep(LENTEUR); },
    reply: async () => { marquer(); inter.replied = true; await sleep(LENTEUR); return {}; },
    deferReply: async () => { marquer(); inter.deferred = true; await sleep(LENTEUR); },
    deferUpdate: async () => { marquer(); inter.deferred = true; await sleep(LENTEUR); },
    update: async () => { marquer(); inter.replied = true; await sleep(LENTEUR); return {}; },
    editReply: async () => { marquer(); await sleep(LENTEUR); return {}; },
    followUp: async () => { await sleep(LENTEUR); return {}; },
  };
  return { inter, cap };
}

function optionsMock(sub) {
  return {
    getSubcommand: () => sub,
    getSubcommandGroup: () => null,
    getString: () => null,
    getBoolean: () => null,
    getChannel: () => null,
    getRole: () => null,
    getUser: () => null,
    getMember: () => null,
    getInteger: () => null,
    getAttachment: () => null,
  };
}

/** Séquence exacte d'index.js : filet → action → garde-fou. */
async function commeIndex(faire, inter) {
  const stopFilet = filetDeSecurite(inter, 2200);
  try {
    await faire(inter);
  } catch { /* le catch d'index.js répond ; le chronomètre, lui, a déjà parlé */ }
  finally { stopFilet(); }
  if (!inter.replied && !inter.deferred) await repondre(inter, { texte: 'Cette commande n\'a rien à afficher.' });
}

let ok = 0, ko = 0;
async function epreuve(nom, config, faire) {
  const t0 = Date.now();
  const { inter, cap } = interTorture(t0, config);
  const p = commeIndex(() => faire(inter), inter);
  await sleep(3200); // on laisse la fenêtre Discord (3 s) se refermer
  const delai = cap.premier;
  if (delai !== null && delai < 3000) {
    ok += 1;
    console.log(`  ✅ ${nom} — accusé à ${delai} ms (< 3000)`);
  } else {
    ko += 1;
    console.log(`  ❌ ${nom} — ${delai === null ? 'AUCUN accusé' : 'accusé à ' + delai + ' ms : TROP TARD'}`);
    process.exitCode = 1;
  }
  await p.catch(() => {});
}

(async () => {
  // ─── les 8 sous-commandes de /ticket, une par une ───
  for (const sub of ['setup', 'panel', 'config', 'reparer', 'claim', 'add', 'remove', 'close']) {
    await epreuve('/ticket ' + sub, { options: optionsMock(sub) }, inter => cmdTicket.execute(inter));
  }
  // ─── les boutons du panneau et du ticket ───
  await epreuve('bouton « Ouvrir un ticket »', { customId: 'ticket:ouvrir' }, inter => h.handleButton(inter));
  await epreuve('bouton d\'item « ticket:ouvrir:t1 »', { customId: 'ticket:ouvrir:t1' }, inter => h.handleButton(inter));
  await epreuve('bouton inconnu (ancien panneau)', { customId: 'ticket:inconnu-du-futur' }, inter => h.handleButton(inter));
  await epreuve('bouton « prendre en charge »', { customId: 'ticket:reclamer' }, inter => h.handleButton(inter));
  await epreuve('bouton « fermer le ticket »', { customId: 'ticket:fermer' }, inter => h.handleButton(inter));
  // ─── menus et formulaires ───
  await epreuve('menu « ouvrir un ticket » (type)', { kind: 'select', customId: 'tkt:type-ouvrir', values: ['t1'] }, inter => h.handleSelectMenu(inter));
  await epreuve('modal « ticket:sujet » (vraie création, salon lent)', { fields: { getTextInputValue: () => 'mon problème est lent' } }, inter => h.handleModal(inter));
  await epreuve('modal « tkt:sujet:t1 » (création par type)', { customId: 'tkt:sujet:t1', fields: { getTextInputValue: () => 'bug' } }, inter => h.handleModal(inter));

  // ─── le filet pur : handler qui pend 4 s sans rien dire du tout ───
  {
    const t0 = Date.now();
    const { inter, cap } = interTorture(t0);
    const stopFilet = filetDeSecurite(inter, 2200);
    await sleep(4000); // le handler ne répond jamais lui-même : le filet doit parler
    stopFilet();
    if (cap.premier !== null && cap.premier < 3000) { ok += 1; console.log(`  ✅ filet seul sur handler muet — prend le relais à ${cap.premier} ms`); }
    else { ko += 1; console.log(`  ❌ filet seul — délai ${cap.premier} ms`); process.exitCode = 1; }
  }

  // ─── store en panne : réponse d'erreur, jamais de silence, jamais de crash ───
  {
    const t0 = Date.now();
    const original = store.getGuild;
    store.getGuild = () => { throw new Error('base morte'); };
    const { inter, cap } = interTorture(t0, { customId: 'ticket:ouvrir' });
    await commeIndex(i => h.handleButton(i), inter);
    store.getGuild = original;
    if (cap.premier !== null && cap.premier < 3000) { ok += 1; console.log(`  ✅ store en panne — réponse à ${cap.premier} ms, pas de crash`); }
    else { ko += 1; console.log('  ❌ store en panne — silence'); process.exitCode = 1; }
  }

  if (rejections > 0) { ko += 1; console.log(`  ❌ ${rejections} promesse(s) non traitée(s) en arrière-plan`); process.exitCode = 1; }
  console.log(`\nfilet-torture : ${ok}/${ok + ko} — ${ko ? 'ÉCHEC(S) ❌' : 'aucun chemin ne peut faire attendre un membre plus de 3 secondes ✅'}`);
})();
