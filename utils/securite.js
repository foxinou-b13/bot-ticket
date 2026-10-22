/**
 * utils/securite.js
 * Petits garde-fous, sans dépendance :
 *  - anti-spam (un membre ne peut pas matraquer les boutons / les tickets)
 *  - nettoyage des textes saisis (mentions @everyone, caractères invisibles)
 *  - vérification des permissions du bot avant d'agir
 */
const { PermissionFlagsBits } = require('discord.js');

// clé -> date du dernier passage
const dernierPassage = new Map();

/**
 * Anti-spam : renvoie true si l'action est autorisée.
 * @param {string} cle      identifiant (ex: `ticket:${userId}`)
 * @param {number} delaiMs  temps minimum entre deux actions
 */
function autorise(cle, delaiMs) {
  const maintenant = Date.now();
  const avant = dernierPassage.get(cle) || 0;
  if (maintenant - avant < delaiMs) return { ok: false, reste: Math.ceil((delaiMs - (maintenant - avant)) / 1000) };
  dernierPassage.set(cle, maintenant);
  // Nettoyage mémoire (Map qui ne grossit pas indéfiniment)
  if (dernierPassage.size > 5000) {
    for (const [k, v] of dernierPassage) if (maintenant - v > 600000) dernierPassage.delete(k);
  }
  return { ok: true, reste: 0 };
}

/**
 * Nettoie un texte saisi par un membre :
 *  - retire les mentions @everyone / @here et les caractères invisibles
 *  - réduit les espaces multiples
 */
function nettoyerTexte(texte, max = 200) {
  return String(texte || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/@(everyone|here)/gi, '@\u200B$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Nettoie un texte MULTI-LIGNES (raison d'ouverture) :
 *  - garde les retours à la ligne et les lignes vides
 *  - supprime les caractères invisibles et neutralise @everyone / @here
 *  - supprime les espaces en trop en fin de ligne
 */
function nettoyerMultiligne(texte, max = 400) {
  return String(texte || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/@(everyone|here)/gi, '@\u200B$1')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, max);
}

// Permissions que le bot doit posséder pour faire fonctionner les tickets
const BESOINS = [
  ['GérerLesSalons', PermissionFlagsBits.ManageChannels],
  ['VoirLesSalons', PermissionFlagsBits.ViewChannel],
  ['EnvoyerDesMessages', PermissionFlagsBits.SendMessages],
  ['JoindreDesFichiers', PermissionFlagsBits.AttachFiles],
  ['LireLHistorique', PermissionFlagsBits.ReadMessageHistory],
  // Nécessaires pour les emojis maison et la gestion des rôles staff
  ['GererLesExpressions', PermissionFlagsBits.ManageGuildExpressions],
];

/**
 * Liste les permissions manquantes du bot sur le serveur.
 * @returns {string[]} noms lisibles des permissions manquantes (vide = tout va bien)
 */
/** Accepte un serveur OU directement le membre du bot. */
function permissionsManquantes(cible) {
  const me = cible?.members?.me || cible;
  if (!me || !me.permissions) return [];
  return BESOINS.filter(([, bit]) => !me.permissions.has(bit)).map(([nom]) => nom);
}

module.exports = { autorise, nettoyerTexte, nettoyerMultiligne, permissionsManquantes };
