/**
 * utils/emojis.js — bibliothèque d'emotes « One Assist » v2 (180 emotes).
 *
 * CE QUI CHANGE PAR RAPPORT À L'ANCIENNE VERSION
 * ──────────────────────────────────────────────
 * Avant : les 50 emojis étaient copiés DANS chaque serveur (50 emplacements
 *         pris sur les 50 disponibles → impossible chez la plupart des serveurs).
 * Maintenant : les emotes sont des **emojis d'application** Discord
 *         (POST /applications/{id}/emojis). Un bot peut en posséder jusqu'à
 *         2000, elles fonctionnent dans TOUS les serveurs où il est présent,
 *         sans permission supplémentaire et sans que les membres aient Nitro.
 *
 * 3 niveaux de repli, dans cet ordre :
 *   1. emoji d'application (partout, automatique)
 *   2. emoji créé dans le serveur (si l'app emoji manque mais le serveur l'a)
 *   3. emoji classique (le texte d'origine) — jamais de case vide
 */
const fs = require('node:fs');
const path = require('node:path');

const DOSSIER_EMOTES = path.join(__dirname, '..', 'assets', 'emotes');
const FICHIER_CATALOGUE = path.join(DOSSIER_EMOTES, 'catalogue.json');
const DOSSIER_ANCIENS = path.join(__dirname, '..', 'assets', 'emojis');

// ─── Catalogue ───
let catalogue = { emotes: [], categories: [] };
try {
  catalogue = JSON.parse(fs.readFileSync(FICHIER_CATALOGUE, 'utf8'));
} catch (erreur) {
  console.error('⚠️ Catalogue d\'emotes illisible :', erreur.message);
}

const PAR_CLE = new Map(catalogue.emotes.map(e => [e.cle, e]));
const CATEGORIES = catalogue.categories;
const NOMS = catalogue.emotes.map(e => e.cle);
const SECOURS = Object.fromEntries(catalogue.emotes.map(e => [e.cle, e.secours]));

/** Anciennes clés (v1) → nouvelle clé : rien ne casse dans le code existant. */
const ANCIENNES = {
  oa_billet: 'oa_ticket_ouvert',
  oa_ouvrir: 'oa_ticket_ouvert',
  oa_fermer: 'oa_ticket_ferme',
  oa_pris: 'oa_ticket_pris_en_charge',
  oa_attente: 'oa_ticket_en_attente',
  oa_heure: 'oa_ticket_chrono',
  oa_chrono: 'oa_ticket_chrono',
  oa_calendrier: 'oa_ticket_chrono',
  oa_membre: 'oa_comu_membre',
  oa_ajouter: 'oa_comu_pouce',
  oa_retirer: 'oa_ticket_retour',
  oa_plus: 'oa_comu_pouce',
  oa_moins: 'oa_ticket_retour',
  oa_valide: 'oa_ticket_valide',
  oa_refuse: 'oa_ticket_ferme',
  oa_renommer: 'oa_ticket_note',
  oa_staff: 'oa_staff_bouclier',
  oa_support: 'oa_comu_bulle',
  oa_loupe: 'oa_ticket_recherche',
  oa_achat: 'oa_eco_bon_achat',
  oa_paiement: 'oa_eco_carte',
  oa_euro: 'oa_eco_piece',
  oa_lien: 'oa_sys_wifi',
  oa_question: 'oa_sys_ampoule',
  oa_alerte: 'oa_secu_alerte',
  oa_info: 'oa_sys_ampoule',
  oa_note: 'oa_ticket_note',
  oa_pouls: 'oa_eco_hausse',
  oa_engrenage: 'oa_sys_parametre',
  oa_megaphone: 'oa_comu_annonce',
  oa_coeur: 'oa_comu_coeur',
  oa_etoile: 'oa_comu_etoile',
  oa_archive: 'oa_ticket_archive',
  oa_dossier: 'oa_ticket_dossier',
  oa_document: 'oa_ticket_note',
  oa_bouclier: 'oa_staff_bouclier',
  oa_eclair: 'oa_game_eclair',
  oa_fusee: 'oa_sys_deploiement',
  oa_horloge24: 'oa_sys_horloge',
  oa_badge: 'oa_staff_badge',
  oa_trophee: 'oa_game_trophee',
  oa_panier: 'oa_eco_boutique',
  oa_discussion: 'oa_comu_bulle',
  oa_envoi: 'oa_ticket_mail',
  oa_micro: 'oa_comu_annonce',
  oa_ampoule: 'oa_sys_ampoule',
  oa_epingle: 'oa_ticket_priorite',
  oa_entree: 'oa_ticket_retour',
  oa_pouce: 'oa_comu_pouce',
  oa_drapeau: 'oa_ticket_urgent',
};

function cleDe(nom) {
  if (!nom) return null;
  if (PAR_CLE.has(nom)) return nom;
  if (ANCIENNES[nom] && PAR_CLE.has(ANCIENNES[nom])) return ANCIENNES[nom];
  return null;
}

// ─── Emojis d'application : « nom → <:nom:id> » ───
const appEmojis = new Map();
let syncFaite = false;
let syncEnCours = null;

function texteEmoji(nom, id, anime) {
  return `<${anime ? 'a' : ''}:${nom}:${id}>`;
}

/** Recharge la liste des emojis possédés par l'application (globaux). */
async function chargerApplication(client) {
  if (!client || !client.application) return appEmojis;
  try {
    const liste = await client.application.emojis.fetch();
    appEmojis.clear();
    for (const e of liste.values()) appEmojis.set(e.name, { id: e.id, anime: !!e.animated });
  } catch (erreur) {
    console.error('⚠️ Lecture des emojis d\'application impossible :', erreur.message);
  }
  return appEmojis;
}

function fichierDe(cle) {
  const e = PAR_CLE.get(cle);
  if (!e) return null;
  const chemin = path.join(DOSSIER_EMOTES, e.fichier);
  return fs.existsSync(chemin) ? chemin : null;
}

/**
 * Crée les emojis d'application manquants (180 au total).
 * Sûr à appeler à chaque démarrage : ne recrée rien, reprend là où il s'est arrêté.
 * @returns {Promise<{crees:number, presents:number, erreur?:string}>}
 */
async function synchroniserApplication(client, options = {}) {
  if (!client || !client.application) return { crees: 0, presents: 0, erreur: 'client non prêt' };
  if (syncEnCours) return syncEnCours;
  syncEnCours = (async () => {
    await chargerApplication(client);
    let crees = 0;
    let arret = null;
    const aCreer = NOMS.filter(nom => !appEmojis.has(nom));

    for (const nom of aCreer) {
      const chemin = fichierDe(nom);
      if (!chemin) continue;
      try {
        const emoji = await client.application.emojis.create({
          attachment: chemin,
          name: nom,
          reason: 'Bibliothèque officielle One Assist',
        });
        appEmojis.set(emoji.name, { id: emoji.id, anime: !!emoji.animated });
        crees += 1;
      } catch (erreur) {
        const code = erreur && (erreur.code || (erreur.rawError && erreur.rawError.code));
        if (code === 429) {
          const attente = Math.min((erreur.rawError && erreur.rawError.retry_after) || 60, 900);
          arret = `limite Discord : reprise dans ${Math.ceil(attente / 60)} min`;
          setTimeout(() => { syncEnCours = null; synchroniserApplication(client); }, attente * 1000);
          break;
        }
        console.error(`Emote ${nom} non créée :`, erreur.message);
      }
      // petite pause : on ne martèle pas l'API (180 créations au premier lancement)
      await new Promise(r => setTimeout(r, options.pause ?? 120));
    }

    syncFaite = true;
    syncEnCours = null;
    if (!options.silencieux) {
      console.log(`🎨 Bibliothèque d'emotes : ${appEmojis.size}/${NOMS.length} disponible(s)` +
        (crees ? ` · ${crees} créée(s)` : '') + (arret ? ` · ${arret}` : ''));
    }
    return { crees, presents: appEmojis.size, erreur: arret };
  })();
  return syncEnCours;
}

// ─── Emojis de serveur (repli) : « guildId → Map(nom → <:nom:id>) » ───
const enCache = new Map();

function rafraichir(guild) {
  const table = new Map();
  if (guild && guild.emojis && guild.emojis.cache) {
    for (const emoji of guild.emojis.cache.values()) {
      if (PAR_CLE.has(emoji.name) || ANCIENNES[emoji.name]) {
        table.set(emoji.name, texteEmoji(emoji.name, emoji.id, emoji.animated));
      }
    }
  }
  enCache.set(guild ? guild.id : 'global', table);
  return table;
}

/**
 * Rend un emoji prêt à l'emploi.
 * 1) emoji d'application (fonctionne partout) → 2) emoji du serveur → 3) emoji classique.
 */
function ej(guildOrId, nom) {
  const cle = cleDe(nom) || nom;
  const app = appEmojis.get(cle);
  if (app) return texteEmoji(cle, app.id, app.anime);
  const id = guildOrId && typeof guildOrId === 'object' ? guildOrId.id : guildOrId;
  const table = enCache.get(id) || enCache.get('global');
  if (table && table.has(cle)) return table.get(cle);
  if (table && table.has(nom)) return table.get(nom);
  return SECOURS[cle] || SECOURS[nom] || '';
}

/** Version sans serveur : emoji d'application si possible, sinon emoji classique. */
function ejSecours(nom) {
  const cle = cleDe(nom) || nom;
  const app = appEmojis.get(cle);
  if (app) return texteEmoji(cle, app.id, app.anime);
  return SECOURS[cle] || SECOURS[nom] || '';
}

/** Forme utilisable dans un bouton / menu : objet emoji ou chaîne. */
function emojiPour(guildOrId, nom) {
  const texte = ej(guildOrId, nom);
  const m = /^<a?:(\w+):(\d+)>$/.exec(texte);
  if (m) return { id: m[2], name: m[1], animated: texte.startsWith('<a:') };
  return texte;
}

/** Vrai si la chaîne est déjà un emoji Discord personnalisé. */
function estEmojiPerso(valeur) {
  return /^<a?:\w+:\d+>$/.test(String(valeur || '').trim());
}

/** Extrait l'identifiant d'un emoji personnalisé (« <:nom:123>` » → {nom, id}). */
function detailEmoji(valeur) {
  const m = /^<a?:(\w+):(\d+)>$/.exec(String(valeur || '').trim());
  return m ? { nom: m[1], id: m[2], anime: String(valeur).startsWith('<a:') } : null;
}

/**
 * Vérifie qu'un emoji saisi par un administrateur est utilisable.
 * Accepte : emoji classique (« 🎫 »), emote de la bibliothèque, emoji perso du serveur.
 */
function validerEmoji(valeur, guild) {
  const texte = String(valeur || '').trim();
  if (!texte) return { ok: true, vide: true };
  if (estEmojiPerso(texte)) {
    const d = detailEmoji(texte);
    if (appEmojis.has(d.nom) && appEmojis.get(d.nom).id === d.id) return { ok: true, type: 'bibliotheque', ...d };
    const table = enCache.get(guild && guild.id) || new Map();
    if ([...table.values()].some(v => v.endsWith(`:${d.id}>`))) return { ok: true, type: 'serveur', ...d };
    if (appEmojis.has(d.nom)) return { ok: true, type: 'bibliotheque', ...d };
    return { ok: false, raison: "Cet emote n'existe plus dans la bibliothèque du bot." };
  }
  if (/\p{Extended_Pictographic}/u.test(texte)) return { ok: true, type: 'classique' };
  return { ok: false, raison: "Ce n'est pas un emoji valide." };
}

/** État de la bibliothèque : {presents, total, manquants[]}. */
function etat() {
  const manquants = NOMS.filter(nom => !appEmojis.has(nom));
  return { presents: appEmojis.size, total: NOMS.length, manquants, prete: manquants.length === 0 };
}

/** Emotes d'une catégorie (pour la bibliothèque de sélection). */
function emotesDe(categorie) {
  return catalogue.emotes.filter(e => !categorie || e.categorie === categorie);
}

/** Recherche par nom ou catégorie (la barre de recherche de la bibliothèque). */
function rechercher(texte) {
  const q = String(texte || '').toLowerCase().trim();
  if (!q) return catalogue.emotes;
  return catalogue.emotes.filter(e =>
    e.cle.includes(q) || e.categorie.includes(q) || (e.secours || '').includes(q));
}

/** L'emote existe-t-elle dans la bibliothèque ? */
function existe(nom) {
  return PAR_CLE.has(nom);
}

/** Une emote est-elle animée ? */
function estAnimee(nom) {
  const e = PAR_CLE.get(cleDe(nom) || nom);
  return !!e && e.genre === 'gif';
}

/** Texte prêt à coller dans un message (bibliothèque → repli). */
function texte(nom) {
  return `${ej(null, nom)} `.trim();
}

// ─── Compatibilité avec l'ancienne API (installation dans le serveur) ───
async function nettoyerDoublons(guild) {
  if (!guild || !guild.emojis) return 0;
  await guild.emojis.fetch().catch(() => null);
  const vus = new Set();
  let supprimes = 0;
  const tries = [...guild.emojis.cache.values()].sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0));
  for (const emoji of tries) {
    if (!PAR_CLE.has(emoji.name)) continue;
    if (!vus.has(emoji.name)) { vus.add(emoji.name); continue; }
    try { await emoji.delete('One Assist : doublon'); supprimes += 1; } catch { /* ignoré */ }
  }
  if (supprimes) rafraichir(guild);
  return supprimes;
}

/**
 * Ancienne fonction « installer dans le serveur ».
 * Conservée pour compatibilité : elle ne fait plus rien si les emojis
 * d'application sont disponibles (c'est le cas normal).
 */
async function installer(guild) {
  rafraichir(guild);
  return { crees: 0, presents: appEmojis.size, erreur: null };
}

async function installerSiBesoin(guild) {
  rafraichir(guild);
  return { crees: 0, presents: appEmojis.size };
}

module.exports = {
  // catalogue
  CATEGORIES, NOMS, SECOURS, catalogue,
  emotesDe, rechercher, existe, estAnimee, cleDe, detailEmoji, estEmojiPerso, validerEmoji,
  // rendu
  ej, ejSecours, emojiPour, texte, etat,
  // application emojis
  chargerApplication, synchroniserApplication, appEmojis,
  // compatibilité
  installer, installerSiBesoin, rafraichir, nettoyerDoublons,
};
