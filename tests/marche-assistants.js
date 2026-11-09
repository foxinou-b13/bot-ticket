/**
 * tests/marche-assistants.js — LA MARCHE COMPLÈTE (arpentage réel).
 *
 * On ouvre chaque assistant comme un membre, puis on clique TOUT ce que le bot
 * affiche : chaque bouton, CHAQUE option réelle de chaque menu, et on envoie
 * chaque formulaire proposé (bouton → showModal → on soumet le modal capturé),
 * en profondeur sur les nouvelles cartes. Classification des composants par
 * PARSING du vrai payload (types Discord : 2=bouton, 3..8=menus).
 *
 * Un id est « mort » s'il répond « expiré ou inconnu » : c'est précisément ce
 * qu'un membre appelle « ça ne fonctionne pas ». Un clic sans aucune réponse
 * = le vrai « L'application n'a pas répondu ». Les deux sont dénoncés ici.
 */
const store = require('../utils/store');
const h = require('../handlers/ticketHandler');
const cmdSetup = require('../commands/setup');
store.charger();

const G = 'g-marche';
store.setGuild(G, {
  categoryId: 'cat-m',
  logChannelId: 'log-m',
  panelChannelId: 'pan-m',
  staffRoleIds: ['role-staff'],
  panelMode: null, // serveur jamais configuré : le cas le plus casse-cou
  types: [],
  bouton: {
    configure: false,
    categoryId: null,
    panelChannelId: null,
    logChannelId: null,
    staffRoleIds: [],
    panelMessageId: null,
    items: [{ id: 'i1', label: 'Aide', emoji: '🛟', couleur: 'bleu', categoryId: null, staffRoleIds: [] }],
    panel: { titre: null, description: null, image: null, bouton: null },
  },
});

const MORT = /expir[ée] ou inconnu/i;
const dejaVus = new Set();
let nbMorts = [], nbSilence = [], nbCrashs = [], nbCliens = 0;

function norm(p) { try { return JSON.parse(JSON.stringify(p)); } catch { return null; } }
function txt(p) { try { return typeof p === 'string' ? p : JSON.stringify(p || {}); } catch { return ''; } }

// Récupère (genre, id, valeurs) de chaque composant interactif d'un payload,
// À TOUTE PROFONDEUR : conteneurs v2 (17), sections (9), empilés (11), lignes (1).
function composants(p) {
  const out = [];
  const j = norm(p);
  if (!j) return out;
  const push = c => { if (!out.some(o => o.id === c.id && o.valeur === c.valeur)) out.push(c); };
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const x of node) walk(x); return; }
    if (typeof node.custom_id === 'string' && node.custom_id) {
      const t = node.type;
      if (t === 2) { if (!node.disabled) push({ genre: 'button', id: node.custom_id }); }
      else if (t === 3) for (const o of node.options || []) push({ genre: 'select', id: node.custom_id, valeur: o.value });
      else if (t === 5 || t === 6) push({ genre: 'select', id: node.custom_id, valeur: 'u1' });
      else if (t === 7) push({ genre: 'select', id: node.custom_id, valeur: 'role-staff' });
      else if (t === 8) push({ genre: 'select', id: node.custom_id, valeur: 'c-new' });
    }
    for (const k of Object.keys(node)) if (k === 'components' || k === 'accessory') walk(node[k]);
  };
  walk(j.components || j);
  return out;
}

function ctx(cap) {
  const canal = {
    id: 'c-x', name: 'ticket-1',
    send: async p => { cap.envoi = p; return { id: 'm-y', pin: async () => {}, edit: async () => ({}) }; },
    delete: async () => {},
    edit: async () => canal,
    setTopic: async () => {},
    permissionOverwrites: { edit: async () => {}, delete: async () => {} },
    messages: { fetch: async () => ({ filter: () => new Map(), find: () => null, size: 0 }) },
  };
  const guild = {
    id: G, name: 'Marche',
    roles: { everyone: { id: 'every' }, cache: new Map([['role-staff', { id: 'role-staff', name: 'Staff' }]]) },
    members: { me: { id: 'bot-1' }, fetch: async () => ({ id: 'u1', user: { username: 'Membre', bot: false, id: 'u1' }, roles: { add: async () => {} } }) },
    channels: { fetch: async () => canal, create: async o => ({ ...canal, id: 'c-new', name: (o && o.name) || 'nouveau' }), cache: new Map() },
  };
  return { canal, guild };
}

function inter(over, cap) {
  const { guild, canal } = ctx(cap);
  const it = {
    guild, guildId: G, channel: canal, channelId: 'c-x',
    member: { permissions: { has: () => true }, roles: { cache: new Set(['role-staff']) }, id: 'u-admin' },
    user: { id: 'u-admin', username: 'Admin', bot: false, tag: 'Admin#1' },
    client: { user: { id: 'bot-1' }, users: { fetch: async () => ({ send: async () => {} }) } },
    message: { id: 'm-msg', edit: async p => { cap.premier = p; return it.message; } },
    replied: false, deferred: false, isRepliable: () => true,
    isButton: () => true, isStringSelectMenu: () => true, isAnySelectMenu: () => true,
    customId: over.customId, values: over.values || [],
    fields: over.fields || null,
    showModal: async m => { cap.fait = 'modal'; cap.modal = m; },
    reply: async p => { cap.fait = 'reply'; cap.premier = p; return {}; },
    deferReply: async () => { cap.fait = 'defer'; },
    deferUpdate: async () => { cap.fait = 'deferUpdate'; },
    update: async p => { cap.fait = 'update'; cap.premier = p; return {}; },
    editReply: async p => { cap.fait = 'editReply'; cap.premier = p; },
    followUp: async () => ({}),
  };
  return it;
}
const champs = { nom: 'Type test', emoji: '🧪', desc: 'une description', titre: 'TITRE', description: 'DESC', selecteur: 'choisis un truc', image: '', sujet: 'sujet test', raison: 'raison test', libelle: 'Aide', texte: 'coucou', q: 'recherche' };

async function cliquer(c, opts = {}) {
  const cle = `${c.genre}|${c.id}|${c.valeur || ''}`;
  if (dejaVus.has(cle)) return [];
  dejaVus.add(cle);
  nbCliens++;
  const cap = {};
  const suivants = [];
  try {
    if (c.genre === 'modal') {
      const it = inter({ customId: c.id, fields: { getTextInputValue: n => (n in champs ? champs[n] : 'x') } }, cap);
      await h.handleModal(it);
    } else if (c.genre === 'select') {
      const it = inter({ customId: c.id, values: [c.valeur] }, cap);
      await h.handleSelectMenu(it);
    } else {
      const it = inter({ customId: c.id }, cap);
      await h.handleButton(it);
    }
  } catch (e) {
    nbCrashs.push(`${c.genre} ${c.id} → CRASH : ${e.message}`);
    return [];
  }
  if (!cap.fait) { nbSilence.push(`${c.genre} ${c.id}`); return []; }
  const rendu = cap.fait === 'modal' ? cap.modal : cap.premier;
  if (MORT.test(txt(rendu)) && !opts.tolereRepli) nbMorts.push(`${c.genre} ${c.id}`);
  if (rendu) {
    suivants.push(rendu);
    // un bouton qui OUVRE un formulaire → on soumet ce formulaire (id réel capturé)
    if (cap.fait === 'modal') {
      const mj = norm(cap.modal);
      if (mj && mj.custom_id) {
        const champIds = JSON.stringify(mj).match(/"custom_id":"([^"]+)"/g)?.map(x => x.slice(13, -1)) || [];
        suivants.push({ auto: { genre: 'modal', id: mj.custom_id } });
      }
    }
  }
  return suivants;
}

(async () => {
  const frontier = [];
  // ─── entrée 1 : /setup ticket bouton ───
  const cap1 = {};
  const i1 = inter({}, cap1);
  i1.options = { getSubcommandGroup: () => 'ticket', getSubcommand: () => 'bouton', getString: () => null };
  i1.isChatInputCommand = () => true; i1.commandName = 'setup';
  try { await cmdSetup.execute(i1); } catch (e) { console.log('❌ /setup ticket bouton CRASH d\'entrée :', e.stack.split('\n')[0]); process.exit(1); }
  if (!cap1.fait) { console.log('❌ /setup ticket bouton : AUCUNE RÉPONSE'); process.exit(1); }
  if (MORT.test(txt(cap1.premier))) { console.log('❌ /setup ticket bouton répond « expiré/inconnu » !'); process.exit(1); }
  console.log('  ✅ /setup ticket bouton répond avec une carte d\'étape');
  if (cap1.premier) frontier.push(cap1.premier);

  // ─── entrée 2 : /setup ticket menu ───
  const cap2 = {};
  const i2 = inter({}, cap2);
  i2.options = { getSubcommandGroup: () => 'ticket', getSubcommand: () => 'menu', getString: () => null };
  i2.isChatInputCommand = () => true; i2.commandName = 'setup';
  try { await cmdSetup.execute(i2); } catch (e) { console.log('❌ /setup ticket menu CRASH d\'entrée :', e.stack.split('\n')[0]); process.exit(1); }
  if (!cap2.fait) { console.log('❌ /setup ticket menu : AUCUNE RÉPONSE'); process.exit(1); }
  console.log('  ✅ /setup ticket menu répond avec le menu principal');
  if (cap2.premier) frontier.push(cap2.premier);

  // ─── arpentage ───
  let file = frontier, niveau = 0;
  while (file.length && niveau < 5) {
    const suivante = [];
    for (const payload of file) {
      const list = [];
      for (const c of composants(payload)) list.push(c);
      const extra = payload.auto ? [payload.auto] : [];
      for (const c of [...list, ...extra]) {
        const r = await cliquer(c);
        for (const x of r) if (x) suivante.push(x);
      }
    }
    file = suivante;
    niveau++;
  }

  console.log(`\narpentage : ${nbCliens} clics distincts sur ${niveau} niveau(x) (boutons + chaque option de menu + formulaires soumis)`);

  // ─── épreuves ciblées : les ids « piégeux » doivent répondre, jamais se taire ───
  const pieges = [
    { genre: 'button', id: 'tktb:etape:0' },          // Retour sur la page 1 (carte périmée)
    { genre: 'button', id: 'tktb:etape:99' },          // Suivant hors plage
    { genre: 'button', id: 'tktb:un-ide-d-une-ancienne-version' }, // id disparu
    { genre: 'select', id: 'tktb:un-menu-d-une-ancienne-version', valeur: 'x' },
    { genre: 'modal', id: 'tktb:un-formulaire-d-une-ancienne-version' },
  ];
  for (const c of pieges) await cliquer(c, { tolereRepli: true });

  let ko = 0;
  if (nbCrashs.length) { ko += nbCrashs.length; console.log('CRASHS :'); for (const c of [...new Set(nbCrashs)].slice(0, 14)) console.log('  ❌ ' + c); }
  if (nbSilence.length) { ko += nbSilence.length; console.log('SILENCES (membre verrait « le bot ne répond pas ») :'); for (const s of [...new Set(nbSilence)].slice(0, 14)) console.log('  ❌ ' + s); }
  if (nbMorts.length) { ko += nbMorts.length; console.log('BOUTONS MORTS (« expiré ou inconnu » sur un id affiché) :'); for (const m of [...new Set(nbMorts)].slice(0, 14)) console.log('  ⚠️  ' + m); }
  if (!ko) console.log('marche-assistants : 0 crash, 0 silence, 0 bouton mort ✅');
  else process.exitCode = 1;
})().catch(e => { console.error('MARCHE EN ERREUR :', e); process.exit(1); });
