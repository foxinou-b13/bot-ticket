/**
 * utils/panneaux.js
 * Toutes les réponses du bot (succès, erreur, information, avertissement)
 * s'affichent dans une CARTE ARRONDIE (conteneur components v2) avec une
 * LIGNE DE COULEUR À GAUCHE (accent) :
 *   vert  = réussite
 *   rouge = erreur
 *   jaune = avertissement
 *   bleu  = information
 *
 * Le panneau public du salon de tickets n'utilise PAS ce module : il garde
 * son apparence mesurée sur la référence (sans accent), comme validé.
 */
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

// Couleurs officielles Discord (rendu natif, lisible de jour comme de nuit)
const COULEURS = {
  succes: 0x57f287,
  erreur: 0xed4245,
  attention: 0xfee75c,
  info: 0x5865f2,
};

// Devine la couleur d'après le texte, pour ne rien oublier de convertir
function couleurAuto(texte = '') {
  const t = String(texte);
  if (/^(\s*)(❌|⛔|🚫)/.test(t) || /\berreur\b/i.test(t) || /^impossible/i.test(t)) return 'erreur';
  if (/^(\s*)(⚠️|🔶)/.test(t)) return 'attention';
  if (/^(\s*)(✅|🎉|🔓)/.test(t)) return 'succes';
  return 'info';
}

/**
 * Construit la carte arrondie.
 * @param {object} o
 * @param {'succes'|'erreur'|'attention'|'info'} o.couleur
 * @param {string} [o.titre]   grosse ligne en gras au-dessus
 * @param {string} [o.texte]   contenu principal
 * @param {string[]} [o.lignes] blocs séparés par un fin trait
 * @param {Array} [o.composants] ActionRow à mettre DANS la carte, en bas
 */
function carte(o = {}) {
  const couleur = COULEURS[o.couleur] ? o.couleur : couleurAuto(o.texte || o.titre || '');
  const conteneur = new ContainerBuilder().setAccentColor(COULEURS[couleur]);
  const entete = [o.titre ? `**${o.titre}**` : null, o.texte || null].filter(Boolean).join('\n');
  if (entete) conteneur.addTextDisplayComponents(new TextDisplayBuilder().setContent(entete));
  for (const bloc of o.lignes || []) {
    if (!bloc) continue;
    conteneur.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    conteneur.addTextDisplayComponents(new TextDisplayBuilder().setContent(String(bloc)));
  }
  const rows = (o.composants || []).filter(Boolean);
  if (rows.length) conteneur.addActionRowComponents(...rows);
  return conteneur;
}

// Charge utile prête pour Discord (components v2 obligatoire)
function payload(o = {}, ephemere = true) {
  const flags = MessageFlags.IsComponentsV2 | (ephemere ? MessageFlags.Ephemeral : 0);
  return { components: [carte(o)], flags };
}

/**
 * Répond à une interaction, quel que soit son état (reply / editReply / followUp).
 * Ne lève jamais d'erreur : une réponse vaut mieux qu'un silence.
 */
async function repondre(interaction, o = {}) {
  const ephemere = o.ephemere !== false;
  const p = payload(o, ephemere);
  const apres = interaction.deferred || interaction.replied;
  try {
    if (interaction.replied) return await interaction.followUp(p);
    if (interaction.deferred) return await interaction.editReply(p);
    return await interaction.reply(p);
  } catch {
    // Si le message d'origine est expiré, on tente un message éphémère direct
    if (apres) return interaction.followUp(p).catch(() => {});
    return undefined;
  }
}

/**
 * Met à jour le message d'origine (boutons / menus) avec une carte arrondie.
 */
async function maj(interaction, o = {}) {
  const p = { ...payload(o, false), embeds: [] };
  try {
    return await interaction.update(p);
  } catch {
    return repondre(interaction, o);
  }
}

module.exports = { COULEURS, couleurAuto, carte, payload, repondre, maj };
