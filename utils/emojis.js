/**
 * utils/emojis.js — emojis maison « One Assist ».
 *
 * Principe : les images sont livrées avec le bot (assets/emojis). À chaque fois
 * que le bot arrive sur un serveur, il crée ces emojis dans le serveur (s'il a la
 * permission « Gérer les expressions »). Les membres n'ont donc PAS besoin de
 * Nitro et rien n'est volé à un autre serveur.
 *
 * Partout où un emoji maison n'a pas pu être créé (plus de place, permission
 * manquante…), le code retombe automatiquement sur un emoji classique.
 */
const fs = require('node:fs');
const path = require('node:path');

// ─── Catalogue : nom de l'emoji → emoji de secours (si non installé) ───
const SECOURS = {
  oa_billet: '🎫',
  oa_ouvrir: '🔓',
  oa_fermer: '🔒',
  oa_pris: '🔔',
  oa_attente: '⏳',
  oa_heure: '🕒',
  oa_chrono: '🕘',
  oa_calendrier: '📅',
  oa_membre: '👤',
  oa_ajouter: '➕',
  oa_retirer: '➖',
  oa_plus: '➕',
  oa_moins: '➖',
  oa_valide: '✅',
  oa_refuse: '❌',
  oa_renommer: '✏️',
  oa_staff: '🛡️',
  oa_support: '💬',
  oa_loupe: '🔍',
  oa_achat: '🛒',
  oa_paiement: '💳',
  oa_euro: '💰',
  oa_lien: '🔗',
  oa_question: '❓',
  oa_alerte: '⚠️',
  oa_info: 'ℹ️',
  oa_note: '📄',
  oa_pouls: '📈',
  oa_engrenage: '⚙️',
  oa_megaphone: '📣',
  oa_coeur: '❤️',
  oa_etoile: '⭐',
  oa_archive: '🗄️',
  oa_dossier: '📁',
  oa_document: '📃',
  oa_bouclier: '🛡️',
  oa_eclair: '⚡',
  oa_fusee: '🚀',
  oa_horloge24: '🔄',
  oa_badge: '🎖️',
  oa_trophee: '🏆',
  oa_panier: '🛍️',
  oa_discussion: '💬',
  oa_envoi: '📨',
  oa_micro: '🎤',
  oa_ampoule: '💡',
  oa_epingle: '📌',
  oa_entree: '➡️',
  oa_pouce: '👍',
  oa_drapeau: '🚩',
};

const DOSSIER = path.join(__dirname, '..', 'assets', 'emojis');
// GuildId → date (ms) avant laquelle Discord refuse de créer des emojis (429)
const prochainEssai = new Map();
// GuildId → promesse d'installation en cours (évite les doublons si deux
// appels partent en même temps)
const verrous = new Map();

/** Supprime les copies en double de NOS emojis (garde une seule version). */
async function nettoyerDoublons(guild) {
  await guild.emojis.fetch().catch(() => null);
  const vus = new Set();
  let supprimes = 0;
  // du plus ancien au plus récent : on garde le premier de chaque nom
  const tries = [...guild.emojis.cache.values()].sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0));
  for (const emoji of tries) {
    if (!NOMS.includes(emoji.name)) continue;
    if (!vus.has(emoji.name)) { vus.add(emoji.name); continue; }
    try {
      await emoji.delete('One Assist : suppression d\'un doublon');
      supprimes += 1;
    } catch { /* ignoré */ }
  }
  if (supprimes) {
    await guild.emojis.fetch().catch(() => null);
    rafraichir(guild);
    console.log(`🧹 ${guild.name} : ${supprimes} doublon(s) d'emoji supprimé(s)`);
  }
  return supprimes;
}
const NOMS = Object.keys(SECOURS);

// guildId → Map(nom → « <:nom:id> »)
const enCache = new Map();
// guildId → true si l'installation a déjà tourné dans cette session
const dejaInstalles = new Set();

function image(nom) {
  const fichier = path.join(DOSSIER, `${nom}.png`);
  return fs.existsSync(fichier) ? fs.readFileSync(fichier) : null;
}

/** Recharge la liste des emojis réellement présents sur le serveur. */
function rafraichir(guild) {
  const table = new Map();
  if (guild && guild.emojis && guild.emojis.cache) {
    for (const emoji of guild.emojis.cache.values()) {
      if (NOMS.includes(emoji.name)) table.set(emoji.name, `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`);
    }
  }
  enCache.set(guild ? guild.id : 'global', table);
  return table;
}

/**
 * Crée les emojis manquants sur le serveur.
 * Ne supprime jamais rien et s'arrête proprement si le serveur est plein.
 * @returns {Promise<{crees:number, presents:number, erreur?:string}>}
 */
async function installer(guild, options = {}) {
  if (!guild || !guild.emojis) return { crees: 0, presents: 0, erreur: 'serveur inconnu' };
  // Un seul passage à la fois par serveur : deux appels simultanés créaient des doublons.
  if (verrous.has(guild.id)) return verrous.get(guild.id);
  const travail = installerInterne(guild, options).finally(() => verrous.delete(guild.id));
  verrous.set(guild.id, travail);
  return travail;
}

async function installerInterne(guild, options = {}) {
  const moi = guild.members && guild.members.me;
  if (moi && !moi.permissions.has('ManageGuildExpressions')) {
    rafraichir(guild);
    return { crees: 0, presents: 0, erreur: 'permission « Gérer les expressions » absente' };
  }

  // Discord limite la création d'emojis : on respecte le délai annoncé
  const attente = prochainEssai.get(guild.id) || 0;
  if (Date.now() < attente) {
    rafraichir(guild);
    return { crees: 0, presents: enCache.get(guild.id).size, erreur: `nouvel essai dans ${Math.ceil((attente - Date.now()) / 60000)} min` };
  }

  await nettoyerDoublons(guild);
  const existants = new Set(guild.emojis.cache.map(e => e.name));
  let crees = 0;
  let arret = null;

  for (const nom of NOMS) {
    if (existants.has(nom)) continue;
    const données = image(nom);
    if (!données) continue;
    try {
      // On revérifie à l'instant T : le serveur a pu gagner l'emoji entre-temps
      if (guild.emojis.cache.some(e => e.name === nom)) continue;
      await guild.emojis.create({ attachment: données, name: nom, reason: 'Emojis officiels One Assist' });
      crees += 1;
      existants.add(nom);
    } catch (erreur) {
      const code = erreur && (erreur.code || (erreur.rawError && erreur.rawError.code));
      // 30008 : limite d'emojis du serveur atteinte → on arrête, sans erreur bloquante
      if (code === 30008) { arret = 'limite d\'emojis du serveur atteinte'; break; }
      if (code === 50013) { arret = 'permission refusée'; break; }
      // 429 : Discord demande d'attendre → on programme un nouvel essai
      if (code === 429) {
        const secondes = (erreur.rawError && erreur.rawError.retry_after) || 600;
        prochainEssai.set(guild.id, Date.now() + Math.min(secondes, 3600) * 1000);
        arret = `limite Discord : nouvel essai dans ${Math.ceil(secondes / 60)} min`;
        break;
      }
      console.error(`Emoji ${nom} non créé :`, erreur.message);
    }
    // Petite pause : évite de se faire limiter par Discord (création en rafale)
    await new Promise(r => setTimeout(r, options.pause ?? 350));
  }

  await guild.emojis.fetch().catch(() => null);
  const table = rafraichir(guild);
  if (!options.silencieux) {
    console.log(`😀 ${guild.name} : ${crees} emoji(s) créé(s), ${table.size}/${NOMS.length} présent(s)${arret ? ' · ' + arret : ''}`);
  }
  return { crees, presents: table.size, erreur: arret || null };
}

/** À appeler quand le bot arrive sur un nouveau serveur. */
async function installerSiBesoin(guild) {
  if (dejaInstalles.has(guild.id)) return { crees: 0, presents: rafraichir(guild).size };
  dejaInstalles.add(guild.id);
  return installer(guild);
}

/**
 * Rend un emoji prêt à être utilisé : `<:oa_x:id>` si installé, sinon l'emoji
 * classique équivalent. `guildOrId` peut être un serveur ou son identifiant.
 */
function ej(guildOrId, nom) {
  const id = guildOrId && typeof guildOrId === 'object' ? guildOrId.id : guildOrId;
  const table = enCache.get(id) || enCache.get('global');
  if (table && table.has(nom)) return table.get(nom);
  return SECOURS[nom] || '';
}

/** Version sans serveur : renvoie toujours l'emoji classique. */
function ejSecours(nom) {
  return SECOURS[nom] || '';
}

/** Forme utilisable dans un bouton / menu : objet emoji ou chaîne. */
function emojiPour(guildOrId, nom) {
  const texte = ej(guildOrId, nom);
  const correspondance = /^<a?:(\w+):(\d+)>$/.exec(texte);
  if (correspondance) return { id: correspondance[2], name: correspondance[1] };
  return texte;
}

/** État des emojis sur un serveur : {presents, total, manquants[]}. */
function etat(guild) {
  const table = rafraichir(guild);
  const manquants = NOMS.filter(nom => !table.has(nom));
  return { presents: table.size, total: NOMS.length, manquants };
}

module.exports = {
  etat,
  nettoyerDoublons,
  NOMS,
  SECOURS,
  installer,
  installerSiBesoin,
  rafraichir,
  ej,
  ejSecours,
  emojiPour,
};
