/**
 * handlers/ticketHandler.js
 * Toute la logique du système de tickets, 100% en français :
 *  - assistant des types de tickets (/setup ticket menu)
 *  - panneau avec menu déroulant des types
 *  - ouverture, prise en charge, ajout/retrait de membres, fermeture
 */
const {
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  AttachmentBuilder,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} = require('discord.js');
const { MessageFlags } = require('discord.js');
const store = require('../utils/store');
const { genererBanniere } = require('../utils/banniere');
const { repondre, maj, carte, payload } = require('../utils/panneaux');
const { autorise, nettoyerTexte, nettoyerMultiligne, permissionsManquantes } = require('../utils/securite');

// ─── Anti double-clic (comme les bots pro) : un seul ticket créé à la fois par membre ───
const creationEnCours = new Set();

// ─── Fermetures en attente de confirmation (salon → { raison, par, expire }) ───
// La raison saisie dans le formulaire est gardée ici, jamais relue dans un message.
const fermeturesEnAttente = new Map();
const DUREE_CONFIRMATION = 5 * 60 * 1000; // 5 minutes

// ─── Petits utilitaires ───
function slug(txt) {
  return String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 25);
}

function coupe(txt, max) {
  const t = String(txt || '');
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

// Permission de configurer : "Gérer le serveur" ou Administrateur
function estAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.Administrator);
}

// Vérifie si un membre fait partie du staff (un des rôles choisis)
function estStaff(member, config) {
  return (config.staffRoleIds || []).some(roleId => member.roles.cache.has(roleId));
}

// Staff pour un ticket précis : rôles du type OU rôles du serveur
function estStaffTicket(member, config, t) {
  const roles = (t && t.staffRoleIds && t.staffRoleIds.length ? t.staffRoleIds : config.staffRoleIds) || [];
  return roles.some(roleId => member.roles.cache.has(roleId));
}

// ─── Panneau public ───
function boutonOuvrir() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:ouvrir')
      .setLabel('Ouvrir un ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Success)
  );
}

const SEP = '──────────────────────────────────';

// Convertit en gras sérif (caractères Unicode) comme les panneaux pro
function serifBold(texte) {
  return String(texte).replace(/[A-Za-z0-9]/g, c => {
    if (c >= 'A' && c <= 'Z') return String.fromCodePoint(0x1d400 + c.charCodeAt(0) - 65);
    if (c >= 'a' && c <= 'z') return String.fromCodePoint(0x1d41a + c.charCodeAt(0) - 97);
    return String.fromCodePoint(0x1d7ce + c.charCodeAt(0) - 48);
  });
}

function embedPanneau(config, options = {}, guildName = null) {
  const p = config.panel || {};
  // Texte par défaut du panneau MENU : style des bots de support pro
  // (paragraphs, séparateurs fins, puces décoratives)
  const defautMenu = [
    `Bienvenue sur le support officiel de ${serifBold(guildName || 'ce serveur')}`,
    SEP,
    'Pour ouvrir un ticket, sélectionnez la catégorie correspondante à votre besoin via le menu ci-dessous et veuillez détailler en quelques lignes votre demande avant l\'ouverture.',
    SEP,
    'ⓘ\uFE0E __**Informations importantes :**__',
    '• Soyez clairs et précis dans vos demandes.',
    '• Le manque de respect envers le staff est strictement interdit.',
    '• Évitez les mentions inutiles.',
    '• Les tickets abusifs ou inactifs seront automatiquement fermés puis supprimés.',
    SEP,
    '⏳ *Merci de votre patience, un membre du staff prendra votre ticket en charge dès que possible.*',
  ].join('\n');
  const defautBouton = [
    "Besoin d'aide ? Clique sur le bouton **🎫 Ouvrir un ticket** ci-dessous.",
    'Un salon privé sera créé pour toi et notre équipe te répondra.',
    SEP,
    '⏳ *Merci de votre patience, un membre du staff prendra ton ticket en charge dès que possible.*',
  ].join('\n');
  const embed = new EmbedBuilder()
    // Bordure de l'embed = couleur du fond du thème sombre Discord :
    // aucune ligne colorée visible, ni à gauche ni ailleurs.
    .setTitle(
      coupe(
        options.titre || p.titre || (guildName ? `👑 ${serifBold('Support | ' + guildName)}` : '🎫 Support'),
        256
      )
    )
    .setDescription(
      coupe(
        options.description ||
          p.description ||
          (modePanneau(config) === 'menu' ? defautMenu : defautBouton),
        4096
      )
    )
  ;
  if (p.image && /^https?:\/\//.test(p.image)) embed.setImage(p.image);
  return embed;
}

// Menu déroulant des types (visible par les membres)
function rowTypes(config) {
  const p = config.panel || {};
  const menu = new StringSelectMenuBuilder()
    .setCustomId('tkt:type-ouvrir')
    .setPlaceholder(coupe(p.selecteur || '🎫 Choisissez le type de ticket...', 100))
    .setMinValues(1)
    .setMaxValues(1);
  for (const type of config.types.slice(0, 25)) {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(coupe(type.nom, 100))
      .setValue(type.id);
    if (type.description) option.setDescription(coupe(type.description, 100));
    if (type.emoji) {
      try { option.setEmoji(type.emoji); } catch { /* emoji invalide : on ignore */ }
    }
    menu.addOptions(option);
  }
  return new ActionRowBuilder().addComponents(menu);
}

// Le mode du panneau dépend du CHOIX du serveur : 'bouton' ou 'menu'
function modePanneau(config) {
  if (config.panelMode === 'menu') return config.types.length ? 'menu' : 'bouton';
  if (config.panelMode === 'bouton') return 'bouton';
  return config.types.length ? 'menu' : 'bouton';
}

function construirePanneau(config, options = {}, guildName = null) {
  // Structure IDENTIQUE à la référence : components v2 Discord
  // (blocs de texte + séparateurs gris + galerie d'image + menu),
  // PAS d'embed → aucune bordure colorée nulle part.
  const p = config.panel || {};
  const nom = guildName || 'ce serveur';
  const fichiers = [];

  const galerie = (() => {
    if (p.image && /^https?:\/\//.test(p.image)) {
      return new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(p.image));
    }
    if (!guildName) return null;
    const nomFichier = `banniere-${Date.now()}.png`;
    fichiers.push(new AttachmentBuilder(genererBanniere(guildName), { name: nomFichier }));
    return new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${nomFichier}`));
  })();

  // CARTE arrondie (conteneur v2, fond gris natif Discord) : mesurée sur la
  // référence — textes + séparateurs FINS serrés + bannière DEDANS.
  // Pas de couleur d'accent → aucune bordure/liseré coloré sur la carte.
  const carte = new ContainerBuilder();
  carte.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(options.titre || p.titre || `**👑 ${serifBold('Support | ' + nom)}**`)
  );

  if (modePanneau(config) === 'menu') {
    carte.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        options.description ||
          p.description ||
          [
            `Bienvenue sur le support officiel de ${serifBold(nom)}`,
            '',
            'Pour ouvrir un ticket, sélectionnez la catégorie correspondante à votre besoin via le menu ci-dessous et veuillez détailler en quelques lignes votre demande avant l\'ouverture.',
          ].join('\n')
      )
    );
    carte.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    carte.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          'ⓘ\uFE0E __**Informations importantes :**__',
          '• Soyez clairs et précis dans vos demandes.',
          '• Le manque de respect envers le staff est strictement interdit.',
          '• Évitez les mentions inutiles.',
          '• Les tickets abusifs ou inactifs seront automatiquement fermés puis supprimés.',
        ].join('\n')
      )
    );
    carte.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    carte.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('⏳ *Merci de votre patience, un membre du staff prendra votre ticket en charge dès que possible.*')
    );
  } else {
    carte.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        options.description ||
          p.description ||
          "Besoin d'aide ? Clique sur le bouton **🎫 Ouvrir un ticket** ci-dessous.\nUn salon privé sera créé pour toi et notre équipe te répondra."
      )
    );
    carte.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    carte.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('⏳ *Merci de votre patience, un membre du staff prendra ton ticket en charge dès que possible.*')
    );
  }

  if (galerie) carte.addMediaGalleryComponents(galerie);

  // Le menu / bouton est DEDANS la carte, tout en bas — vérifié au zoom 4x
  // sur la référence (le sélecteur y est encadré par le fond de la carte).
  carte.addActionRowComponents(modePanneau(config) === 'menu' ? rowTypes(config) : boutonOuvrir());

  const components = [carte];

  // FLAG OBLIGATOIRE components v2 : sans lui Discord refuse le message
  // (« type must be one of (1,) ») car TextDisplay/Separator/MediaGallery
  // ne sont acceptés qu'avec IS_COMPONENTS_V2 (1 << 15).
  return { components, files: fichiers, flags: MessageFlags.IsComponentsV2 };
}

// Envoie (ou met à jour) le panneau dans le salon configuré
// Garantit que le bot peut voir et écrire dans un salon (auto-réparation des permissions)
async function assurerAccesBot(channel) {
  try {
    await channel.permissionOverwrites.edit(channel.guild.members.me.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true,
    });
  } catch {
    // Le bot n'a pas le droit de modifier ce salon : on tentera l'envoi quand même.
  }
}

async function envoyerPanel(guild, config, options = {}) {
  let channel = null;
  if (config.panelChannelId) {
    channel = await guild.channels.fetch(config.panelChannelId).catch(() => null);
  }
  if (!channel) return null;
  await assurerAccesBot(channel);

  // Si un panneau existe déjà, on le met à jour au lieu d'en empiler
  let message = null;
  if (config.panelMessageId) {
    message = await channel.messages.fetch(config.panelMessageId).catch(() => null);
  }
  const contenu = construirePanneau(config, options, guild.name);
  try {
    if (message) {
      // embeds: [] → retire l'ancien embed (interdit avec le flag v2)
      await message.edit({ ...contenu, embeds: [] }).catch(async () => {
        message = await channel.send(contenu);
      });
    } else {
      message = await channel.send(contenu);
    }
  } catch (erreur) {
    console.error('Erreur envoi du panneau :', erreur.message);
    return null;
  }
  store.setGuild(guild.id, { panelMessageId: message.id, panelSent: true });
  return channel;
}

// Sélecteur du /ticket panel : quel panneau envoyer ?
function menuChoixPanneau() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('tkt:panel-choix')
      .setPlaceholder('🎛️ Choisis le panneau à envoyer...')
      .addOptions(
        { value: 'menu', label: '📋 Panneau MENU', description: 'Bannière + menu déroulant des types de tickets (recommandé)' },
        { value: 'bouton', label: '🔘 Panneau BOUTON', description: 'Panneau simple avec un bouton « Ouvrir un ticket »' }
      )
  );
}

// Sélecteur de salon pour le flux /ticket panel (si aucun salon configuré)
function rowSalonChoix() {
  return new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('tkt:panel-chan-choix')
      .setPlaceholder('📬 Salon du panneau...')
      .setChannelTypes([ChannelType.GuildText])
      .setMinValues(1)
      .setMaxValues(1)
  );
}

// Publication + confirmation après choix dans le sélecteur du /ticket panel
async function publierDepuisChoix(interaction, cfg) {
  const channel = await envoyerPanel(interaction.guild, cfg);
  const mode = modePanneau(cfg);
  let texte;
  if (!channel) {
    texte = `❌ Impossible d'envoyer le panneau dans <#${cfg.panelChannelId}>. Vérifie que le bot a la permission d'y écrire.`;
  } else if (mode === 'menu') {
    texte = `✅ **Panneau 📋 MENU publié dans ${channel}** — bannière + menu déroulant (${cfg.types.length} type(s) de tickets).`;
  } else {
    texte = `✅ **Panneau 🔘 BOUTON publié dans ${channel}** — bouton « 🎫 Ouvrir un ticket ».`;
  }
  if (cfg.panelMode === 'menu' && !cfg.types.length) {
    texte += '\n⚠️ Aucun type de ticket créé : c\'est le panneau BOUTON qui est parti. Crée des types avec `/setup ticket menu`.';
  }
  return maj(interaction, { texte: texte });
}

// Menu de sélection des rôles staff (étape finale de /ticket setup)
function menuRoles() {
  return new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('ticket:select-roles')
      .setPlaceholder('👥 Choisis le(s) rôle(s) du staff')
      .setMinValues(1)
      .setMaxValues(10)
  );
}

// ─── Infrastructure : catégorie + salon du panneau + salon de logs ───
// RÈGLES (corrigées après incident) :
//   • on ne crée JAMAIS une deuxième catégorie si une catégorie de tickets existe
//   • un salon configuré qui a été supprimé (ID mort) est détecté et remplacé
//   • le salon de logs reste TOUJOURS dans la catégorie des tickets, invisible
//     pour @everyone, et n'est créé qu'une seule fois
//   • aucune création en double pendant un même appel (verrou)
const infraEnCours = new Map();

async function assoirSalon(guild, id) {
  if (!id || typeof guild.channels.fetch !== 'function') return null;
  return guild.channels.fetch(id).catch(() => null);
}

function chercherCategorieTickets(guild) {
  const cache = guild?.channels?.cache;
  if (!cache || typeof cache.find !== 'function') return null;
  return (
    cache.find(c => c.type === ChannelType.GuildCategory && /tickets?/i.test(c.name)) || null
  );
}

function chercherSalonLogs(guild, categorieId) {
  const cache = guild?.channels?.cache;
  if (!cache || typeof cache.find !== 'function') return null;
  return (
    cache.find(
      c => c.type === ChannelType.GuildText && c.parentId === categorieId && /logs?/i.test(c.name)
    ) || null
  );
}

// Tous les rôles staff du serveur (niveau serveur + niveau type)
function rolesStaffComplets(config) {
  const roles = new Set(config.staffRoleIds || []);
  for (const type of config.types || []) {
    for (const roleId of type.staffRoleIds || []) roles.add(roleId);
  }
  return [...roles];
}

function permsLogs(guild, staffRoleIds) {
  const permissions = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
  ];
  const me = guild.members && guild.members.me;
  if (me) {
    permissions.push({
      id: me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    });
  }
  for (const roleId of staffRoleIds || []) {
    permissions.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }
  return permissions;
}

/**
 * Vérifie et répare l'infrastructure. Idempotent : on peut l'appeler à chaque
 * configuration sans jamais créer de catégorie ou de salon en double.
 * @returns {{config:object, recrees:string[]}}
 */
async function preparerInfra(guild) {
  if (infraEnCours.has(guild.id)) return infraEnCours.get(guild.id);
  const travail = (async () => {
    const config = store.getGuild(guild.id);
    const recrees = [];

    // ── 1. La catégorie des tickets ──
    let categorie = await assoirSalon(guild, config.categoryId);
    if (categorie && categorie.type !== ChannelType.GuildCategory) categorie = null;
    if (!categorie) categorie = chercherCategorieTickets(guild);
    if (!categorie) {
      categorie = await guild.channels.create({
        name: '🎫 Tickets',
        type: ChannelType.GuildCategory,
        reason: 'Infrastructure des tickets (créée une seule fois par le bot)',
      });
      recrees.push('catégorie 🎫 Tickets');
    }

    // ── 2. Le salon de logs (dans la catégorie, invisible pour @everyone) ──
    let logs = await assoirSalon(guild, config.logChannelId);
    if (logs && logs.type !== ChannelType.GuildText) logs = null;
    if (!logs) logs = chercherSalonLogs(guild, categorie.id);
    const rolesStaff = rolesStaffComplets(config);
    if (!logs) {
      logs = await guild.channels.create({
        name: '🔒・logs-tickets',
        type: ChannelType.GuildText,
        parent: categorie.id,
        permissionOverwrites: permsLogs(guild, rolesStaff),
        reason: 'Salon de transcriptions des tickets (créé une seule fois par le bot)',
      });
      recrees.push('salon 🔒・logs-tickets');
    } else {
      if (logs.parentId !== categorie.id && typeof logs.setParent === 'function') {
        await logs.setParent(categorie.id, { lockPermissions: false }).catch(() => {});
      }
      // Le staff doit VOIR les logs : on ajoute les rôles manquants (auto-réparation)
      for (const roleId of rolesStaff) {
        const deja = logs.permissionOverwrites?.cache?.has?.(roleId);
        if (!deja && typeof logs.permissionOverwrites?.edit === 'function') {
          await logs.permissionOverwrites
            .edit(roleId, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true,
              AttachFiles: true,
            })
            .catch(() => {});
        }
      }
    }

    // ── 3. Le salon du panneau ──
    let panneau = await assoirSalon(guild, config.panelChannelId);
    if (panneau && panneau.type !== ChannelType.GuildText) panneau = null;
    if (!panneau) {
      panneau = await guild.channels.create({
        name: 'ouvrir-un-ticket',
        type: ChannelType.GuildText,
        parent: categorie.id,
        permissionOverwrites: [{ id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel] }],
        reason: 'Salon du panneau de tickets (créé une seule fois par le bot)',
      });
      recrees.push('salon ouvrir-un-ticket');
    }

    const config2 = store.setGuild(guild.id, {
      categoryId: categorie.id,
      logChannelId: logs.id,
      panelChannelId: panneau.id,
    });
    // Copie utilisable comme une configuration (compatible avec l'ancien code)
    return { ...config2, recrees, categorie, logs, panneau };
  })();
  infraEnCours.set(guild.id, travail);
  try {
    return await travail;
  } finally {
    infraEnCours.delete(guild.id);
  }
}

/**
 * Supprime les tickets fantômes : un ticket enregistré dont le salon a été
 * supprimé (ou que son auteur ne peut plus voir) bloquait les membres avec
 * « Tu as déjà un ticket ouvert : #salon-inexistant ».
 * @returns {Promise<{purges:number, verifies:number}>}
 */
async function purgerTicketsFantomes(guild, options = {}) {
  const config = store.getGuild(guild.id);
  let purges = 0;
  let verifies = 0;
  for (const [channelId, infos] of Object.entries({ ...config.open })) {
    verifies += 1;
    const salon = await assoirSalon(guild, channelId);
    if (!salon) {
      store.removeTicket(guild.id, channelId);
      purges += 1;
      continue;
    }
    // Le salon existe : l'auteur doit pouvoir le voir, sinon on répare.
    if (options.verifierAcces && infos.userId) {
      const membre = await guild.members?.fetch?.(infos.userId).catch(() => null);
      const perms = membre && salon.permissionsFor ? salon.permissionsFor(membre) : null;
      if (perms && !perms.has(PermissionFlagsBits.ViewChannel)) {
        const ok = await salon.permissionOverwrites
          ?.edit(infos.userId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
          })
          .then(() => true)
          .catch(() => false);
        if (!ok) {
          store.removeTicket(guild.id, channelId);
          purges += 1;
        }
      }
    }
  }
  return { purges, verifies };
}

/**
 * Cherche un ticket réellement utilisable pour ce membre.
 * Le ticket n'est renvoyé que si son salon existe ET reste visible par le membre.
 * Un enregistrement mort est supprimé au passage (plus de blocage fantôme).
 */
async function ticketOuvertReel(guild, userId) {
  const existant = store.findTicketByUser(guild.id, userId);
  if (!existant) return null;
  const salon = await assoirSalon(guild, existant.channelId);
  if (!salon) {
    store.removeTicket(guild.id, existant.channelId);
    return null;
  }
  const membre = await guild.members?.fetch?.(userId).catch(() => null);
  const perms = membre && salon.permissionsFor ? salon.permissionsFor(membre) : null;
  if (perms && !perms.has(PermissionFlagsBits.ViewChannel)) {
    const repare = await salon.permissionOverwrites
      ?.edit(userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true })
      .then(() => true)
      .catch(() => false);
    if (!repare) {
      store.removeTicket(guild.id, existant.channelId);
      return null;
    }
  }
  return { ...existant, salon };
}

// ─── /setup ticket bouton : le système BOUTON, configuré en une commande ───
async function configBouton(interaction) {
  if (!estAdmin(interaction.member)) {
    return repondre(interaction, { texte: '❌ Tu dois avoir la permission « Gérer le serveur ».' });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const guild = interaction.guild;
  let config;
  try {
    config = await preparerInfra(guild);
    store.setGuild(guild.id, { panelMode: 'bouton' });
    config = store.getGuild(guild.id);
  } catch (erreur) {
    console.error('Erreur infrastructure :', erreur.message);
    return repondre(interaction, { texte: '❌ Le bot a besoin de la permission **« Gérer les salons »** pour créer la catégorie et les salons. Donne-la lui, puis retape `/setup ticket bouton`.' });
  }

  // Il manque les rôles staff → on les demande (une seule étape)
  if (!config.staffRoleIds.length) {
    return repondre(interaction, {
      couleur: 'info',
      titre: '🔘 Mode BOUTON choisi',
      texte: 'Le panneau aura un bouton « 🎫 Ouvrir un ticket ».',
      lignes: [
        [
          `📁 Catégorie : <#${config.categoryId}>`,
          `🎫 Salon du panneau : <#${config.panelChannelId}>`,
          `📜 Salon de logs : <#${config.logChannelId}>`,
        ].join('\n'),
        '👥 **Dernière étape : choisis le(s) rôle(s) du staff** dans le menu ci-dessous.\nTu peux sélectionner **plusieurs rôles** en même temps.',
      ],
      composants: [menuRoles()],
    });
  }

  const channel = await envoyerPanel(guild, config);
  return repondre(interaction, {
    couleur: channel ? 'succes' : 'attention',
    titre: channel ? '✅ Système BOUTON configuré' : '⚠️ Système configuré, panneau non publié',
    lignes: [
      [
        `👥 Rôles staff (${config.staffRoleIds.length}) : ${config.staffRoleIds.map(id => `<@&${id}>`).join(', ')}`,
        `📁 Catégorie : <#${config.categoryId}>`,
        `📜 Salon de logs : <#${config.logChannelId}>`,
        channel ? `🎫 Panneau bouton : publié dans ${channel}` : '❌ Panneau impossible à envoyer : vérifie que le bot peut écrire dans le salon du panneau.',
      ].join('\n'),
      '💡 Pour passer au **menu des types** plus tard : `/setup ticket menu`.',
    ],
  });
}

// ════════════════════════════════════════════════════════
// ASSISTANT DES TYPES DE TICKETS (/setup ticket menu)
// ════════════════════════════════════════════════════════
function embedAssistant(config) {
  const lignes = config.types.length
    ? config.types.map(t => {
        const cat = t.categoryId ? `<#${t.categoryId}>` : (config.categoryId ? `<#${config.categoryId}> (par défaut)` : '❌ aucune');
        const nbRoles = (t.staffRoleIds || []).length;
        return `${t.emoji ? t.emoji + ' ' : '🔹'}**${coupe(t.nom, 60)}** — 📁 ${cat} — 🛡️ ${nbRoles} rôle(s) staff`;
      })
    : ['Aucun type — commence avec « ➕ Nouveau type ».'];
  return new EmbedBuilder()
    .setTitle('📋 Assistant des types de tickets')
    .setDescription(
      [
        'Choisis un type à modifier, crée-en un nouveau, ou termine.',
        '',
        `🔹 **Types actuels (${config.types.length})**`,
        ...lignes,
        '',
        '🎨 **Textes du panneau** : titre, description et texte du sélecteur.',
        '✅ **Terminer** : choisis le salon, et le panneau (menu des types) y est publié.',
      ].join('\n')
    );
}

// Corps de texte de l'assistant (repris de l'embed historique, pour la carte)
function texteAssistant(config) {
  const lignes = config.types.length
    ? config.types.map(t => {
        const cat = t.categoryId ? `<#${t.categoryId}>` : (config.categoryId ? `<#${config.categoryId}> (par défaut)` : '❌ aucune');
        const nbRoles = (t.staffRoleIds || []).length;
        return `${t.emoji ? t.emoji + ' ' : '🔹'}**${coupe(t.nom, 60)}** — 📁 ${cat} — 🛡️ ${nbRoles} rôle(s) staff`;
      })
    : ['Aucun type — commence avec « ➕ Nouveau type ».'];
  return [
    'Choisis un type à modifier, crée-en un nouveau, ou termine.',
    '',
    `🔹 **Types actuels (${config.types.length})**`,
    ...lignes,
    '',
    '🎨 **Textes du panneau** : titre, description et texte du sélecteur.',
    '✅ **Terminer** : choisis le salon, et le panneau (menu des types) y est publié.',
  ].join('\n');
}

function rowAssistant(config) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('tkt:main')
    .setPlaceholder('Choisissez un type...')
    .setMinValues(1)
    .setMaxValues(1);
  for (const type of config.types.slice(0, 21)) {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(coupe(type.nom, 100))
      .setValue(type.id);
    if (type.description) option.setDescription(coupe(type.description, 100));
    if (type.emoji) {
      try { option.setEmoji(type.emoji); } catch { /* ignoré */ }
    }
    menu.addOptions(option);
  }
  menu.addOptions(
    new StringSelectMenuOptionBuilder()
      .setLabel('Nouveau type')
      .setEmoji('➕')
      .setValue('__new__')
      .setDescription('Créer un type de ticket'),
    new StringSelectMenuOptionBuilder()
      .setLabel('Textes du panneau')
      .setEmoji('🎨')
      .setValue('__panel__')
      .setDescription('Titre, description, texte du sélecteur, image'),
    new StringSelectMenuOptionBuilder()
      .setLabel('Réinitialiser les textes')
      .setEmoji('🧹')
      .setValue('__reset__')
      .setDescription('Revenir aux textes complets par défaut'),
    new StringSelectMenuOptionBuilder()
      .setLabel('Terminer')
      .setEmoji('✅')
      .setValue('__done__')
      .setDescription('Publier le panneau dans le salon configuré')
  );
  return new ActionRowBuilder().addComponents(menu);
}

async function menuPrincipal(interaction) {
  if (!estAdmin(interaction.member)) {
    return repondre(interaction, { texte: '❌ Tu dois avoir la permission « Gérer le serveur ».' });
  }
  const config = store.getGuild(interaction.guild.id);
  return repondre(interaction, {
    titre: '📋 Assistant des types de tickets',
    texte: texteAssistant(config),
    composants: [rowAssistant(config)],
  });
}

// ─── Assistant guidé d'un type : étape par étape, dans l'ordre ───
const WIZARD_STEPS = ['nom', 'emoji', 'desc', 'cat', 'roles', 'fin'];

// Explication de chaque étape : aide la personne qui configure à comprendre
const WIZARD_INFOS = {
  nom: {
    titre: '✏️ Étape 1/6 — Le nom du type',
    aide: 'C\'est le nom que les membres verront dans le menu déroulant du panneau. Il sert aussi pour le nom du salon du ticket (exemple : `ticket-1-probleme-live`).',
  },
  emoji: {
    titre: '😄 Étape 2/6 — L\'emoji du type',
    aide: 'Un emoji affiché devant le nom du type, dans le menu du panneau et dans le salon du ticket. Il aide les membres à reconnaître le type en un coup d\'œil.',
  },
  desc: {
    titre: '📝 Étape 3/6 — La description du type',
    aide: 'Une phrase courte affichée sous le nom du type dans le menu déroulant. Elle explique aux membres dans quel cas choisir ce type.',
  },
  cat: {
    titre: '📁 Étape 4/6 — La catégorie des tickets',
    aide: 'La catégorie où les tickets de ce type seront créés. Si tu ne choisis rien, la catégorie principale des tickets du serveur sera utilisée.',
  },
  roles: {
    titre: '🛡️ Étape 5/6 — Les rôles staff du type',
    aide: 'Les rôles du staff qui pourront voir et prendre en charge les tickets de ce type. Tu peux en mettre plusieurs. Si tu n\'en mets aucun, les rôles staff du serveur seront utilisés.',
  },
  fin: {
    titre: '✅ Étape 6/6 — Récapitulatif',
    aide: 'Ton type est prêt ! Vérifie le résumé ci-dessous, puis clique sur « Terminer ». Tu pourras créer d\'autres types ou publier le panneau.',
  },
};

function valeurEtape(type, config, step) {
  if (step === 'nom') return [{ name: 'Nom actuel', value: type.nom }];
  if (step === 'emoji') return [{ name: 'Emoji actuel', value: type.emoji || 'aucun' }];
  if (step === 'desc') return [{ name: 'Description actuelle', value: type.description || 'aucune' }];
  if (step === 'cat') {
    return [{
      name: 'Catégorie actuelle',
      value: type.categoryId
        ? `<#${type.categoryId}>`
        : config.categoryId
          ? `<#${config.categoryId}> (par défaut)`
          : '❌ aucune',
    }];
  }
  if (step === 'roles') {
    return [{
      name: `Rôles staff actuels (${(type.staffRoleIds || []).length})`,
      value: (type.staffRoleIds || []).length
        ? coupe(type.staffRoleIds.map(id => `<@&${id}>`).join(', '), 1000)
        : 'aucun — les rôles staff du serveur seront utilisés',
    }];
  }
  // fin : récapitulatif complet
  return [
    { name: '✏️ Nom', value: type.nom, inline: true },
    { name: '😄 Emoji', value: type.emoji || 'aucun', inline: true },
    {
      name: '📁 Catégorie',
      value: type.categoryId
        ? `<#${type.categoryId}>`
        : config.categoryId
          ? `<#${config.categoryId}> (par défaut)`
          : '❌ aucune',
      inline: true,
    },
    { name: '📝 Description', value: type.description || 'aucune' },
    {
      name: `🛡️ Rôles staff (${(type.staffRoleIds || []).length})`,
      value: coupe(
        (type.staffRoleIds || []).length
          ? type.staffRoleIds.map(id => `<@&${id}>`).join(', ')
          : 'aucun — les rôles staff du serveur',
        1000
      ),
    },
  ];
}

function embedWizard(type, config, step) {
  const info = WIZARD_INFOS[step];
  const numero = WIZARD_STEPS.indexOf(step) + 1;
  return new EmbedBuilder()
    .setTitle(`${type.emoji ? type.emoji + ' ' : ''}${coupe(type.nom, 200)}`)
    .setDescription(`**${info.titre}**\n\n💡 ${info.aide}`)
    .addFields(valeurEtape(type, config, step))
    .setFooter({ text: `Étape ${numero}/${WIZARD_STEPS.length} — utilise les boutons ci-dessous` });
}

function rowWizard(typeId, step) {
  const index = WIZARD_STEPS.indexOf(step);
  const boutons = [];
  if (step === 'nom') boutons.push(new ButtonBuilder().setCustomId(`tkt:wiz-act:${typeId}:nom`).setLabel('Renommer').setEmoji('✏️').setStyle(ButtonStyle.Primary));
  if (step === 'emoji') boutons.push(new ButtonBuilder().setCustomId(`tkt:wiz-act:${typeId}:emoji`).setLabel("Changer l'emoji").setEmoji('😄').setStyle(ButtonStyle.Primary));
  if (step === 'desc') boutons.push(new ButtonBuilder().setCustomId(`tkt:wiz-act:${typeId}:desc`).setLabel('Modifier la description').setEmoji('📝').setStyle(ButtonStyle.Primary));
  if (step === 'cat') boutons.push(new ButtonBuilder().setCustomId(`tkt:wiz-cat:${typeId}`).setLabel('Choisir la catégorie').setEmoji('📁').setStyle(ButtonStyle.Primary));
  if (step === 'roles') {
    boutons.push(new ButtonBuilder().setCustomId(`tkt:wiz-addroles:${typeId}`).setLabel('Ajouter un rôle').setEmoji('➕').setStyle(ButtonStyle.Primary));
    boutons.push(new ButtonBuilder().setCustomId(`tkt:wiz-delroles:${typeId}`).setLabel('Retirer un rôle').setEmoji('➖').setStyle(ButtonStyle.Secondary));
  }
  if (step === 'fin') boutons.push(new ButtonBuilder().setCustomId(`tkt:wiz-del:${typeId}`).setLabel('Supprimer ce type').setEmoji('🗑️').setStyle(ButtonStyle.Danger));
  if (index > 0) boutons.push(new ButtonBuilder().setCustomId(`tkt:wiz-back:${typeId}:${step}`).setLabel('Retour').setEmoji('⬅️').setStyle(ButtonStyle.Secondary));
  if (index < WIZARD_STEPS.length - 1) boutons.push(new ButtonBuilder().setCustomId(`tkt:wiz-next:${typeId}:${step}`).setLabel('Suivant').setEmoji('➡️').setStyle(ButtonStyle.Success));
  if (step === 'fin') boutons.push(new ButtonBuilder().setCustomId(`tkt:wiz-done:${typeId}`).setLabel('Terminer').setEmoji('✅').setStyle(ButtonStyle.Success));
  return new ActionRowBuilder().addComponents(boutons);
}

async function afficherWizard(interaction, typeId, step, note) {
  const config = store.getGuild(interaction.guild.id);
  const type = store.getType(interaction.guild.id, typeId);
  if (!type) return afficherMenu(interaction, '❌ Ce type n\'existe plus.');
  const info = WIZARD_INFOS[step] || WIZARD_INFOS.nom;
  const numero = WIZARD_STEPS.indexOf(step) + 1;
  const champs = valeurEtape(type, config, step)
    .map(c => `**${c.name}**\n${c.value}`)
    .join('\n\n');
  const options = {
    couleur: note && /^❌/.test(note) ? 'erreur' : 'info',
    titre: `${type.emoji ? type.emoji + ' ' : ''}${coupe(type.nom, 120)}`,
    texte: `**${info.titre}**\n\n💡 ${info.aide}`,
    lignes: [champs, note || null, `-# Étape ${numero}/${WIZARD_STEPS.length} — utilise les boutons ci-dessous`].filter(Boolean),
    composants: [rowWizard(typeId, step)],
  };
  if (interaction.replied || interaction.deferred) return repondre(interaction, { ...options, ephemere: false });
  return maj(interaction, options);
}

async function afficherMenu(interaction, note) {
  const config = store.getGuild(interaction.guild.id);
  const options = {
    couleur: note && /^❌/.test(note) ? 'erreur' : 'info',
    titre: '📋 Assistant des types de tickets',
    texte: texteAssistant(config),
    lignes: note ? [note] : [],
    composants: [rowAssistant(config)],
  };
  if (interaction.replied || interaction.deferred) return repondre(interaction, { ...options, ephemere: false });
  return maj(interaction, options);
}

// ─── Formulaires (modals) de l'assistant ───
function modalNouveauType() {
  const modal = new ModalBuilder().setCustomId('tkt:m-newtype').setTitle('➕ Nouveau type');
  const champ = new TextInputBuilder()
    .setCustomId('nom')
    .setLabel('Nom du type *')
    .setPlaceholder('Exemple : Problème Live, Signalement...')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(45)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(champ));
  return modal;
}

function modalTypeChamp(type, kind) {
  const modal = new ModalBuilder();
  let champ;
  if (kind === 'rename') {
    modal.setCustomId(`tkt:m-rename:${type.id}`).setTitle('✏️ Renommer le type');
    champ = new TextInputBuilder()
      .setCustomId('nom')
      .setLabel('Nouveau nom du type *')
      .setStyle(TextInputStyle.Short)
      .setValue(coupe(type.nom, 45))
      .setMaxLength(45)
      .setRequired(true);
  } else if (kind === 'emoji') {
    modal.setCustomId(`tkt:m-emoji:${type.id}`).setTitle('😄 Changer l\'emoji');
    champ = new TextInputBuilder()
      .setCustomId('emoji')
      .setLabel('Emoji du type (laisse vide pour aucun)')
      .setStyle(TextInputStyle.Short)
      .setValue(type.emoji || '')
      .setMaxLength(8)
      .setRequired(false);
  } else {
    modal.setCustomId(`tkt:m-desc:${type.id}`).setTitle('📝 Description du type');
    champ = new TextInputBuilder()
      .setCustomId('desc')
      .setLabel('Description (affichée dans le menu des types)')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(type.description || '')
      .setMaxLength(100)
      .setRequired(false);
  }
  modal.addComponents(new ActionRowBuilder().addComponents(champ));
  return modal;
}

function modalPanel(config) {
  const p = config.panel || {};
  const modal = new ModalBuilder().setCustomId('tkt:m-panel').setTitle('🎨 Textes du panneau');
  const titre = new TextInputBuilder()
    .setCustomId('titre')
    .setLabel('Titre du panneau (vide = défaut)')
    .setStyle(TextInputStyle.Short)
    .setValue(p.titre || '')
    .setMaxLength(90)
    .setRequired(false);
  const description = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Texte du panneau (vide = défaut)')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(p.description || '')
    .setMaxLength(1500)
    .setRequired(false);
  const selecteur = new TextInputBuilder()
    .setCustomId('selecteur')
    .setLabel('Texte du sélecteur de types (vide = défaut)')
    .setStyle(TextInputStyle.Short)
    .setValue(p.selecteur || '')
    .setMaxLength(90)
    .setRequired(false);
  const image = new TextInputBuilder()
    .setCustomId('image')
    .setLabel('Lien d\'une image bannière (facultatif)')
    .setStyle(TextInputStyle.Short)
    .setValue(p.image || '')
    .setMaxLength(300)
    .setRequired(false);
  modal.addComponents(
    new ActionRowBuilder().addComponents(titre),
    new ActionRowBuilder().addComponents(description),
    new ActionRowBuilder().addComponents(selecteur),
    new ActionRowBuilder().addComponents(image)
  );
  return modal;
}

// ════════════════════════════════════════════════════════
// ACTIONS DU TICKET (appelées par le menu ET par les boutons)
// Extraites ici pour être utilisées à l'identique par les deux chemins.
// ════════════════════════════════════════════════════════
function ticketCourant(interaction) {
  return store.getTicket(interaction.guild.id, interaction.channel.id);
}

// ➕ Ajouter un membre
async function actionAjouterMembre(interaction, t, config) {
  if (!estStaffTicket(interaction.member, config, t)) {
    return repondre(interaction, { couleur: 'erreur', texte: '❌ Seul le staff de ce ticket peut ajouter un membre.' });
  }
  return repondre(interaction, {
    titre: '➕ Ajouter un membre au ticket',
    texte: 'Choisis une ou plusieurs personnes dans la liste : elles pourront voir et écrire dans ce salon.',
    composants: [
      new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId('ticket:membre-choix')
          .setPlaceholder('👥 Choisis le(s) membre(s) à ajouter')
          .setMinValues(1)
          .setMaxValues(5)
      ),
    ],
  });
}

// ➖ Retirer un membre (uniquement ceux ajoutés au ticket)
async function actionRetirerMembre(interaction, t, config, guild) {
  if (!estStaffTicket(interaction.member, config, t)) {
    return repondre(interaction, { couleur: 'erreur', texte: '❌ Seul le staff de ce ticket peut retirer un membre.' });
  }
  const membres = (t.membres || []).filter(Boolean);
  if (!membres.length) {
    return repondre(interaction, {
      couleur: 'attention',
      titre: '👥 Aucun membre à retirer',
      texte: "Seuls les membres **ajoutés** au ticket apparaissent ici. Utilise « ➕ Ajouter un membre » d'abord.",
    });
  }
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket:membre-retirer')
    .setPlaceholder('👥 Choisis le(s) membre(s) à retirer')
    .setMinValues(1)
    .setMaxValues(Math.min(membres.length, 5));
  for (const userId of membres.slice(0, 25)) {
    const membre = await guild.members?.fetch?.(userId).catch(() => null);
    const nomAffiche = membre ? (membre.displayName || membre.user?.username || userId) : `Membre ${userId}`;
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(coupe(nomAffiche, 100))
        .setValue(userId)
        .setDescription('Retirer son accès à ce ticket')
    );
  }
  return repondre(interaction, {
    titre: '➖ Retirer un membre du ticket',
    texte: 'Seuls les membres **ajoutés à ce ticket** sont proposés ci-dessous.',
    composants: [new ActionRowBuilder().addComponents(menu)],
  });
}

// ✏️ Renommer le ticket
function actionRenommer(interaction, t, config) {
  if (!estStaffTicket(interaction.member, config, t)) {
    return repondre(interaction, { couleur: 'erreur', texte: '❌ Seul le staff de ce ticket peut le renommer.' });
  }
  const modal = new ModalBuilder().setCustomId('ticket:renommer-modal').setTitle('✏️ Renommer le ticket');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('nom')
        .setLabel('Nouveau nom du ticket *')
        .setPlaceholder('Exemple : probleme-live')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(60)
        .setRequired(true)
        .setValue((t.nomPerso || '').slice(0, 60))
    )
  );
  return interaction.showModal(modal);
}

// 🔒 Fermer le ticket (formulaire de raison → carte de confirmation)
function actionFermer(interaction, t, config) {
  if (!estStaffTicket(interaction.member, config, t)) {
    return repondre(interaction, {
      couleur: 'erreur',
      titre: '🔒 Fermeture réservée au staff',
      texte: 'Seul un membre du staff de ce ticket peut le fermer. Si ton problème est réglé, demande-lui de fermer.',
    });
  }
  const modal = new ModalBuilder().setCustomId('ticket:raison-fermeture').setTitle('🔒 Fermer le ticket');
  const champ = new TextInputBuilder()
    .setCustomId('raison')
    .setLabel('Raison de la fermeture *')
    .setPlaceholder('Exemple : problème réglé, ticket inactif...')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(200)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(champ));
  return interaction.showModal(modal);
}

// ─── À l'intérieur d'un ticket ───
// DANS la carte : le bouton « Prendre en charge » + UN SEUL menu pour tout le reste.
function boutonsTicket(t) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:reclamer')
      .setLabel(t.claimedBy ? 'Pris en charge' : 'Prendre en charge')
      .setEmoji('🔔')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!!t.claimedBy)
  );
}

// Menu unique (rassemble les 3 anciens boutons) — hors « Prendre en charge »
function menuActionsTicket(t) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket:actions')
    .setPlaceholder('⚙️ Gérer ce ticket…')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Ajouter un membre')
        .setValue('ajouter')
        .setEmoji('➕')
        .setDescription('Donner accès au ticket à une personne'),
      new StringSelectMenuOptionBuilder()
        .setLabel(`Retirer un membre${(t.membres || []).length ? ` (${t.membres.length})` : ''}`)
        .setValue('retirer')
        .setEmoji('➖')
        .setDescription('Retirer une personne ajoutée au ticket'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Renommer le ticket')
        .setValue('renommer')
        .setEmoji('✏️')
        .setDescription('Changer le nom du salon du ticket'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Fermer le ticket')
        .setValue('fermer')
        .setEmoji('🔒')
        .setDescription('Fermer le ticket (raison demandée)')
    );
  return new ActionRowBuilder().addComponents(menu);
}

// Date lisible en français (21/10/2026 à 22:04)
function dateFr(ms) {
  return new Date(ms || Date.now()).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Carte du ticket (conteneur arrondi, AUCUNE ligne de couleur).
 * Remplace l'ancien embed : tout est dans la même carte propre, boutons compris.
 */
function carteTicket(t, options = {}) {
  const carte = new ContainerBuilder();
  const mentions = options.mentions ? [`<@${t.userId}>`, ...(t.staffRoleIds || []).map(r => `<@&${r}>`)].join(' ') : null;
  const entete = [`## 🎫 Ticket #${t.numero}`, mentions].filter(Boolean).join('\n');
  carte.addTextDisplayComponents(new TextDisplayBuilder().setContent(entete));
  carte.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  const infos = [
    `👤 **Ouvert par** : <@${t.userId}>`,
    `📌 **Statut** : ${t.claimedBy ? `pris en charge par <@${t.claimedBy}>` : '⏳ en attente du staff'}`,
  ];
  if (t.typeNom) infos.push(`🏷️ **Type** : ${t.typeEmoji ? t.typeEmoji + ' ' : ''}${t.typeNom}`);
  // La raison de l'ouverture est affichée dans un BLOC DE CODE (triple backtick),
  // comme demandé. Les backticks saisis par le membre sont neutralisés pour que
  // le bloc ne se referme pas au milieu de la raison.
  if (t.sujet) {
    const raison = String(t.sujet).replace(/`/g, "'").replace(/\r/g, '');
    infos.push(`📝 **Raison de l'ouverture** :\n\`\`\`\n${raison}\n\`\`\``);
  }
  if ((t.membres || []).length) infos.push(`👥 **Membres ajoutés** : ${t.membres.map(u => `<@${u}>`).join(', ')}`);
  carte.addTextDisplayComponents(new TextDisplayBuilder().setContent(infos.join('\n')));
  carte.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  carte.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# Utilise les boutons ci-dessous · ouvert le ${dateFr(t.createdAt)}`
    )
  );
  carte.addActionRowComponents(boutonsTicket(t), menuActionsTicket(t));
  return carte;
}

// Charge utile complète de la carte du ticket (components v2 obligatoire)
function payloadTicket(t, options = {}) {
  return {
    components: [carteTicket(t, options)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { users: [t.userId], roles: t.staffRoleIds || [] },
  };
}

// Compatibilité : certains chemins anciens utilisent encore embedTicket
function embedTicket(t) {
  const embed = new EmbedBuilder()
    .setTitle(`🎫 Ticket #${t.numero}`)
    .addFields(
      { name: 'Ouvert par', value: `<@${t.userId}>`, inline: true },
      { name: 'Statut', value: t.claimedBy ? `Pris en charge par <@${t.claimedBy}>` : '⏳ En attente du staff', inline: true }
    )
    .setTimestamp(t.createdAt);
  if (t.typeNom) embed.addFields({ name: 'Type', value: `${t.typeEmoji ? t.typeEmoji + ' ' : ''}${t.typeNom}`, inline: true });
  if (t.sujet) embed.setDescription(`**Sujet :** ${t.sujet}`);
  return embed;
}

/**
 * Met à jour la carte (épinglée) de TOUS les tickets ouverts d'un serveur.
 * Utile après une évolution de la carte : les anciens tickets prennent la
 * nouvelle disposition (bouton « Prendre en charge » + menu unique).
 * @returns {Promise<{misAJour:number, ignores:number}>}
 */
async function rafraichirCartesTickets(guild) {
  const config = store.getGuild(guild.id);
  let misAJour = 0;
  let ignores = 0;
  for (const [channelId, t] of Object.entries({ ...config.open })) {
    try {
      const salon = await guild.channels.fetch(channelId).catch(() => null);
      if (!salon || !t.messageId) { ignores += 1; continue; }
      const message = await salon.messages.fetch(t.messageId).catch(() => null);
      if (!message) { ignores += 1; continue; }
      // On ne remet PAS les mentions pour ne pas re-notifier le staff
      await message.edit({ ...payloadTicket(t, { mentions: false }), embeds: [] });
      misAJour += 1;
    } catch {
      ignores += 1;
    }
  }
  return { misAJour, ignores };
}

// Met à jour le message d'accroche du ticket (carte + boutons)
async function rafraichirMessageTicket(interaction, t) {
  try {
    const message = await interaction.channel.messages.fetch(t.messageId);
    await message.edit({ ...payloadTicket(t), embeds: [] });
  } catch {
    // Le message a peut-être été supprimé : on ignore.
  }
}

// ─── Ouverture d'un ticket (bouton OU type du menu) ───
async function creerTicket(interaction, sujetBrut, typeId) {
  const guild = interaction.guild;
  // La raison peut tenir sur plusieurs lignes (elle est affichée dans un bloc de code)
  const sujet = nettoyerMultiligne(sujetBrut, 400);
  const config = store.getGuild(guild.id);
  const type = typeId ? store.getType(guild.id, typeId) : null;

  const categoryId = (type && type.categoryId) || config.categoryId;
  const staffRoleIds = (type && type.staffRoleIds && type.staffRoleIds.length)
    ? type.staffRoleIds
    : config.staffRoleIds;

  if (!categoryId || !staffRoleIds || staffRoleIds.length === 0) {
    return {
      erreur: "Le système de tickets n'est pas configuré. Un administrateur doit faire `/ticket setup` puis `/setup ticket menu`.",
    };
  }

  // ── Sécurité anti-spam : 10 s minimum entre deux demandes ──
  const delai = autorise(`ticket-creer:${guild.id}:${interaction.user.id}`, 10000);
  if (!delai.ok) {
    return { erreur: `Tu viens déjà de demander un ticket. Patiente **${delai.reste} seconde(s)** avant de réessayer.` };
  }

  // ── Ticket déjà ouvert ? On vérifie que son salon existe VRAIMENT ──
  // (avant, un ticket fantôme — salon supprimé — bloquait le membre pour toujours)
  const existant = await ticketOuvertReel(guild, interaction.user.id);
  if (existant) {
    return {
      erreur: `Tu as déjà un ticket ouvert : <#${existant.channelId}>.\nRéponds dedans ou demande au staff de le fermer avant d'en ouvrir un nouveau.`,
    };
  }
  if (creationEnCours.has(interaction.user.id)) {
    return { erreur: 'Ton ticket est déjà en cours de création, patiente une seconde...' };
  }
  creationEnCours.add(interaction.user.id);
  try {
    return await creerTicketInterne(interaction, sujet, typeId, categoryId, staffRoleIds, type);
  } finally {
    creationEnCours.delete(interaction.user.id);
  }
}

async function creerTicketInterne(interaction, sujet, typeId, categoryId, staffRoleIds, type) {
  const guild = interaction.guild;
  const numero = store.prochainNumero(guild.id);
  const base = type ? type.nom : sujet;
  const suffixe = `-${slug(base) || 'ticket'}`;

  // Salon privé : seul le membre, LES rôles staff du type et le bot le voient
  const permissions = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageChannels,
      ],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];
  for (const roleId of staffRoleIds) {
    permissions.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  let salon;
  try {
    salon = await guild.channels.create({
      name: coupe(`ticket-${numero}${suffixe}`, 95),
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: permissions,
    });
  } catch (erreur) {
    console.error('Erreur création du ticket :', erreur.message);
    return { erreur: 'Le bot n\'a pas pu créer le salon du ticket. Il lui faut la permission « Gérer les salons ».' };
  }

  const infos = {
    numero,
    userId: interaction.user.id,
    sujet: sujet || null,
    typeId: type ? type.id : null,
    typeNom: type ? type.nom : null,
    typeEmoji: type ? type.emoji || null : null,
    staffRoleIds,
    claimedBy: null,
    createdAt: Date.now(),
  };

  // Tout dans UNE SEULE carte arrondie (membres + rôles staff mentionnés DEDANS)
  const paquet = payloadTicket({ ...infos, staffRoleIds }, { mentions: true });
  let message;
  try {
    message = await salon.send(paquet);
  } catch {
    // Les permissions peuvent mettre une seconde à se propager : on répare et on réessaie.
    await new Promise(r => setTimeout(r, 800));
    await assurerAccesBot(salon);
    try {
      message = await salon.send(paquet);
    } catch (seconde) {
      console.error('Erreur message de bienvenue du ticket :', seconde.message);
      salon.delete().catch(() => {});
      return { erreur: "Je n'ai pas pu écrire dans le salon du ticket. Place mon rôle tout en haut de la liste des rôles (Paramètres du serveur → Rôles), puis réessaie." };
    }
  }
  infos.messageId = message.id;
  store.addTicket(guild.id, salon.id, infos);

  await message.pin().catch(() => {}); // Épingler si le bot en a le droit

  return { salon };
}

// ─── Fermeture d'un ticket ───
async function fermerTicket(interaction, t, raisonBrute) {
  const guild = interaction.guild;
  const raison = nettoyerTexte(raisonBrute, 200);
  fermeturesEnAttente.delete(interaction.channel.id);
  const config = store.getGuild(guild.id);

  // Transcription des 100 derniers messages → salon de logs
  const messages = await interaction.channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (config.logChannelId && messages) {
    const lignes = [...messages.values()]
      .reverse()
      .map(m => `[${new Date(m.createdTimestamp).toLocaleString('fr-FR')}] ${m.author.tag} : ${m.content || '(image / fichier / embed)'}`)
      .join('\n');
    const logChannel = await guild.channels.fetch(config.logChannelId).catch(() => null);
    if (logChannel) {
      await assurerAccesBot(logChannel);
      const infos = [
        `👤 **Ouvert par** : <@${t.userId}>`,
        `🔒 **Fermé par** : <@${interaction.user.id}>`,
        `📝 **Raison** : ${raison || 'Aucune'}`,
      ];
      if (t.typeNom) infos.push(`🏷️ **Type** : ${t.typeEmoji ? t.typeEmoji + ' ' : ''}${t.typeNom}`);
      infos.push(`🕒 **Fermé le** : ${dateFr(Date.now())}`);
      await logChannel
        .send({
          ...payload({ ephemere: false, titre: `🔒 Ticket #${t.numero} fermé`, lignes: [infos.join('\n')] }),
          files: [{ attachment: Buffer.from(lignes.slice(0, 3900), 'utf8'), name: `ticket-${t.numero}.txt` }],
        })
        .catch(() => {});
    }
  }

  // MP à l'auteur du ticket
  const auteur = await interaction.client.users.fetch(t.userId).catch(() => null);
  if (auteur) {
    await auteur
      .send(payload({
        ephemere: false,
        titre: `🔒 Ton ticket #${t.numero} a été fermé`,
        lignes: [
          [
            `🏠 **Serveur** : ${guild.name}`,
            `📝 **Raison** : ${raison || 'Non précisée'}`,
          ].join('\n'),
          'Merci d\'avoir utilisé le support. Tu peux rouvrir un ticket à tout moment.',
        ],
      }))
      .catch(() => {});
  }

  store.removeTicket(guild.id, interaction.channel.id);
  await interaction.channel
    .send(payload({
      ephemere: false,
      titre: '🔒 Fermeture du ticket',
      texte: '⚠️ **Ce salon sera supprimé dans 5 secondes.**\n-# La transcription a été envoyée dans le salon de logs.',
    }))
    .catch(() => {});
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

// ════════════════════════════════════════════════════════
// BOUTONS
// ════════════════════════════════════════════════════════
async function handleButton(interaction) {
  const guild = interaction.guild;
  const config = store.getGuild(guild.id);
  const id = interaction.customId;

  // Bouton du panneau → on demande la raison (obligatoire)
  if (interaction.customId === 'ticket:ouvrir') {
    const modal = new ModalBuilder().setCustomId('ticket:sujet').setTitle('🎫 Ouvrir un ticket');
    const champ = new TextInputBuilder()
      .setCustomId('sujet')
      .setLabel('Raison de ta demande *')
      .setPlaceholder('Explique ta demande. Tu peux écrire plusieurs lignes.')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(400)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(champ));
    return interaction.showModal(modal);
  }

  // ─────────── Prise en charge par le staff ───────────
  if (id === 'ticket:reclamer') {
    const t = store.getTicket(guild.id, interaction.channel.id);
    if (!t) return repondre(interaction, { texte: '❌ Ce salon n\'est plus un ticket actif.' });
    if (!estStaffTicket(interaction.member, config, t)) {
      return repondre(interaction, { texte: '❌ Seul le staff de ce ticket peut le prendre en charge.' });
    }
    if (t.claimedBy) {
      return repondre(interaction, { texte: `Ce ticket est déjà pris en charge par <@${t.claimedBy}>.` });
    }
    const majTicket = store.updateTicket(guild.id, interaction.channel.id, { claimedBy: interaction.user.id });
    await interaction.update({ ...payloadTicket(majTicket), embeds: [] });
    // Message d'information dans la carte (plus de texte brut dans le salon)
    return interaction.channel
      .send(payload({ ephemere: false, titre: '🔔 Ticket pris en charge', texte: `<@${interaction.user.id}> s'occupe désormais de ce ticket.` }))
      .catch(() => {});
  }

  // ─────────── Ajouter un membre au ticket (staff) ───────────
  // ─────────── Actions du ticket (boutons historiques + menu) ───────────
  // Les 3 boutons ont été regroupés dans un menu, mais on garde ces chemins :
  // d'anciens messages (cartes déjà envoyées) peuvent encore les appeler.
  if (id === 'ticket:ajouter-membre' || id === 'ticket:retirer-membre' || id === 'ticket:renommer' || id === 'ticket:fermer') {
    const t = ticketCourant(interaction);
    if (!t) return repondre(interaction, { texte: '❌ Ce salon n\'est plus un ticket actif.' });
    if (id === 'ticket:ajouter-membre') return actionAjouterMembre(interaction, t, config);
    if (id === 'ticket:retirer-membre') return actionRetirerMembre(interaction, t, config, guild);
    if (id === 'ticket:renommer') return actionRenommer(interaction, t, config);
    return actionFermer(interaction, t, config);
  }

  // ─────────── Confirmation de fermeture (boutons Confirmer / Annuler) ───────────
  if (id === 'ticket:confirmer-fermeture') {
    const t = store.getTicket(guild.id, interaction.channel.id);
    if (!t) return maj(interaction, { texte: '❌ Ticket déjà fermé.' });
    if (!estStaffTicket(interaction.member, config, t)) {
      return maj(interaction, { couleur: 'erreur', texte: '❌ Seul le staff de ce ticket peut confirmer la fermeture.' });
    }
    const attente = fermeturesEnAttente.get(interaction.channel.id);
    if (!attente || attente.expire < Date.now()) {
      fermeturesEnAttente.delete(interaction.channel.id);
      return maj(interaction, {
        couleur: 'attention',
        titre: '⌛ Confirmation expirée',
        texte: 'La demande a expiré (5 minutes). Clique de nouveau sur « 🔒 Fermer le ticket ».',
      });
    }
    const raison = attente.raison;
    await maj(interaction, { couleur: 'attention', titre: '🔒 Fermeture en cours…', texte: 'Le salon sera supprimé dans quelques secondes.' });
    return fermerTicket(interaction, t, raison);
  }

  if (id === 'ticket:annuler-fermeture') {
    fermeturesEnAttente.delete(interaction.channel.id);
    return maj(interaction, {
      couleur: 'succes',
      titre: '✅ Fermeture annulée',
      texte: 'Le ticket reste ouvert, aucun message n\'a été supprimé.',
    });
  }

  if (id === 'ticket:annuler') {
    return maj(interaction, { texte: '✅ Annulé, le ticket reste ouvert.' });
  }

  // ─── Assistant guidé d'un type : boutons des étapes ───
  if (id.startsWith('tkt:wiz-')) {
    if (!estAdmin(interaction.member)) {
      return maj(interaction, { texte: '❌ Tu dois avoir la permission « Gérer le serveur ».' });
    }
    const parties = id.split(':'); // ['tkt', 'wiz-xxx', typeId, étape?]
    const action = parties[1];
    const typeId = parties[2];
    const step = parties[3] || null;
    const type = store.getType(guild.id, typeId);
    if (!type) return afficherMenu(interaction, '❌ Ce type n\'existe plus.');

    // Bouton d'action de l'étape (nom / emoji / description) → formulaire
    if (action === 'tkt:wiz-act' || action === 'wiz-act') {
      const kind = step === 'nom' ? 'rename' : step; // 'rename' | 'emoji' | 'desc'
      return interaction.showModal(modalTypeChamp(type, kind));
    }

    // Choisir la catégorie → menu des catégories
    if (action === 'wiz-cat') {
      return maj(interaction, {
        couleur: 'info',
        titre: `📁 Catégorie du type « ${type.nom} »`,
        texte: 'Choisis la catégorie où ses tickets seront créés.',
        composants: [
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId(`tkt:cat:${typeId}`)
              .setPlaceholder('📁 Choisis la catégorie de ce type')
              .setChannelTypes([ChannelType.GuildCategory])
              .setMinValues(1)
              .setMaxValues(1)
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`tkt:wiz-backto:${typeId}:cat`).setLabel('Revenir à l\'étape').setEmoji('⬅️').setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Ajouter / retirer des rôles staff → menu des rôles
    if (action === 'wiz-addroles' || action === 'wiz-delroles') {
      if (action === 'wiz-delroles' && !(type.staffRoleIds || []).length) {
        return afficherWizard(interaction, typeId, 'roles', '❌ Ce type n\'a aucun rôle staff à retirer.');
      }
      const ajout = action === 'wiz-addroles';
      return maj(interaction, {
        couleur: 'info',
        titre: ajout ? `➕ Rôles staff du type « ${type.nom} »` : `➖ Rôles staff du type « ${type.nom} »`,
        texte: ajout ? 'Choisis un ou plusieurs rôles à ajouter.' : 'Choisis un ou plusieurs rôles à retirer.',
        composants: [
          new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder()
              .setCustomId(`${ajout ? 'tkt:addroles' : 'tkt:delroles'}:${typeId}`)
              .setPlaceholder(ajout ? '🛡️ Ajoute un ou plusieurs rôles staff' : '🛡️ Retire un ou plusieurs rôles staff')
              .setMinValues(1)
              .setMaxValues(10)
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`tkt:wiz-backto:${typeId}:roles`).setLabel('Revenir à l\'étape').setEmoji('⬅️').setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Navigation : retour / suivant / revenir à l'étape
    if (action === 'wiz-back' || action === 'wiz-next' || action === 'wiz-backto') {
      let cible = step;
      if (action === 'wiz-back' || action === 'wiz-next') {
        const index = WIZARD_STEPS.indexOf(step);
        cible = WIZARD_STEPS[action === 'wiz-back' ? index - 1 : index + 1] || step;
      }
      return afficherWizard(interaction, typeId, cible, null);
    }

    // Supprimer le type
    if (action === 'wiz-del') {
      const nom = type.nom;
      store.removeType(guild.id, typeId);
      return afficherMenu(interaction, `🗑️ Type « ${nom} » supprimé.`);
    }

    // Terminer : retour au menu principal
    if (action === 'wiz-done') {
      return afficherMenu(interaction, `✅ Type « ${type.nom} » prêt ! Crée d'autres types, ou clique sur « ✅ Terminer » pour choisir le salon du panneau.`);
    }
  }

  // Retour depuis le choix du salon du panneau
  if (id === 'tkt:panel-cancel') {
    return afficherMenu(interaction, null);
  }

  // ─── Sécurité : bouton inconnu ou expiré → on répond quand même ───
  return repondre(interaction, { texte: '❌ Ce bouton est expiré ou inconnu.' });
}

// ════════════════════════════════════════════════════════
// MENUS DÉROULANTS
// ════════════════════════════════════════════════════════
async function handleSelectMenu(interaction) {
  const guild = interaction.guild;
  const id = interaction.customId;

  // ── Menu unique « ⚙️ Gérer ce ticket… » → redirige vers la bonne action ──
  if (id === 'ticket:actions') {
    const config = store.getGuild(guild.id);
    const t = ticketCourant(interaction);
    if (!t) return maj(interaction, { texte: '❌ Ce salon n\'est plus un ticket actif.' });
    const choix = interaction.values[0];
    if (choix === 'ajouter') return actionAjouterMembre(interaction, t, config);
    if (choix === 'retirer') return actionRetirerMembre(interaction, t, config, guild);
    if (choix === 'renommer') return actionRenommer(interaction, t, config);
    if (choix === 'fermer') return actionFermer(interaction, t, config);
    return maj(interaction, { couleur: 'attention', texte: '❌ Choix inconnu dans le menu du ticket.' });
  }

  // ── Retrait d'un membre ajouté au ticket ──
  if (id === 'ticket:membre-retirer') {
    const config = store.getGuild(guild.id);
    const t = store.getTicket(guild.id, interaction.channel.id);
    if (!t) return maj(interaction, { texte: '❌ Ce salon n\'est plus un ticket actif.' });
    if (!estStaffTicket(interaction.member, config, t)) {
      return maj(interaction, { couleur: 'erreur', texte: '❌ Seul le staff de ce ticket peut retirer un membre.' });
    }
    const autorises = new Set(t.membres || []);
    const retires = [];
    for (const userId of interaction.values) {
      // Sécurité : on ne retire QUE les membres réellement ajoutés au ticket
      if (!autorises.has(userId)) continue;
      const ok = await interaction.channel.permissionOverwrites
        ?.delete(userId)
        .then(() => true)
        .catch(() => false);
      if (ok) retires.push(userId);
    }
    if (!retires.length) {
      return maj(interaction, { couleur: 'attention', texte: 'Aucun membre retiré (personne ne correspond à un membre ajouté).' });
    }
    const restants = [...autorises].filter(id => !retires.includes(id));
    store.updateTicket(guild.id, interaction.channel.id, { membres: restants });
    await interaction.channel
      .send(payload({
        ephemere: false,
        titre: '➖ Membre(s) retiré(s) du ticket',
        texte: `${retires.map(u => `<@${u}>`).join(', ')} — retiré(s) par <@${interaction.user.id}>.`,
        allowedMentions: { parse: [] },
      }))
      .catch(() => {});
    return maj(interaction, {
      couleur: 'succes',
      titre: '✅ Membre(s) retiré(s)',
      texte: `${retires.map(u => `<@${u}>`).join(', ')} — accès à ce ticket retiré.`,
    });
  }

  // ── Ajout de membre(s) depuis le bouton « ➕ Ajouter un membre » ──
  if (id === 'ticket:membre-choix') {
    const config = store.getGuild(guild.id);
    const t = store.getTicket(guild.id, interaction.channel.id);
    if (!t) return maj(interaction, { texte: '❌ Ce salon n\'est plus un ticket actif.' });
    if (!estStaffTicket(interaction.member, config, t)) {
      return maj(interaction, { couleur: 'erreur', texte: '❌ Seul le staff de ce ticket peut ajouter un membre.' });
    }
    const ajoutes = [];
    const echecs = [];
    for (const userId of interaction.values) {
      if (userId === t.userId) continue; // le créateur a déjà accès
      const ok = await interaction.channel.permissionOverwrites
        ?.edit(userId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AttachFiles: true,
        })
        .then(() => true)
        .catch(() => false);
      if (ok) ajoutes.push(userId);
      else echecs.push(userId);
    }
    if (ajoutes.length) {
      // On mémorise QUI a été ajouté : le bouton « Retirer un membre » ne
      // proposera que ces personnes (jamais tout le serveur).
      const membres = new Set(t.membres || []);
      for (const id of ajoutes) membres.add(id);
      store.updateTicket(guild.id, interaction.channel.id, { membres: [...membres] });
    }
    if (!ajoutes.length && !echecs.length) {
      return maj(interaction, { couleur: 'attention', texte: 'Ce membre a déjà accès au ticket.' });
    }
    if (!ajoutes.length) {
      return maj(interaction, {
        couleur: 'erreur',
        titre: 'Ajout impossible',
        texte: 'Je n\'ai pas pu modifier les permissions de ce salon. Vérifie que mon rôle est bien au-dessus des autres dans la liste des rôles.',
      });
    }
    // Une carte dans le salon pour garder une trace claire (pas de texte brut)
    await interaction.channel
      .send(payload({
        ephemere: false,
        titre: '➕ Membre(s) ajouté(s) au ticket',
        texte: `${ajoutes.map(u => `<@${u}>`).join(', ')} — ajouté(s) par <@${interaction.user.id}>.`,
      }))
      .catch(() => {});
    return maj(interaction, {
      couleur: 'succes',
      titre: '✅ Membre(s) ajouté(s)',
      texte: `${ajoutes.map(u => `<@${u}>`).join(', ')} ${ajoutes.length > 1 ? 'peuvent' : 'peut'} maintenant voir et écrire dans ce ticket.`,
    });
  }

  // ── Étape finale de /ticket setup : choix des rôles staff ──
  if (id === 'ticket:select-roles') {
    const roles = interaction.values;
    store.setGuild(guild.id, { staffRoleIds: roles });
    let cfg;
    try {
      cfg = await preparerInfra(guild);
    } catch (erreur) {
      console.error('Erreur infrastructure :', erreur.message);
      return maj(interaction, { texte: '❌ Le bot a besoin de la permission **« Gérer les salons »** pour créer les salons. Donne-la lui, puis retape la commande.' });
    }
    const channel = await envoyerPanel(guild, cfg);
    const mode = modePanneau(cfg);
    const liste = roles.map(r => `<@&${r}>`).join(', ');

    return maj(interaction, {
      couleur: channel ? 'succes' : 'attention',
      titre: mode === 'bouton' ? '🔘 Système BOUTON configuré' : '📋 Système MENU configuré',
      lignes: [
        [
          `👥 Rôles staff (${roles.length}) : ${liste}`,
          `📁 Catégorie : <#${cfg.categoryId}>`,
          `📜 Salon de logs : ${cfg.logChannelId ? `<#${cfg.logChannelId}>` : '—'}`,
          `🎫 Panneau : ${channel ? `publié dans ${channel}` : '❌ salon introuvable, fais `/ticket panel`'}`,
        ].join('\n'),
        mode === 'bouton'
          ? '💡 Pour passer au **menu des types** plus tard : `/setup ticket menu`.'
          : '💡 Pour revenir au **panneau bouton** plus tard : `/setup ticket bouton`.',
      ],
    });
  }

  // ── Panneau public : un membre choisit un type → formulaire ──
  if (id === 'tkt:type-ouvrir') {
    const typeId = interaction.values[0];
    const type = store.getType(guild.id, typeId);
    if (!type) {
      return repondre(interaction, { texte: '❌ Ce type de ticket n\'existe plus. Le panneau va être mis à jour.' });
    }
    const modal = new ModalBuilder()
      .setCustomId(`tkt:sujet:${typeId}`)
      .setTitle(coupe(`🎫 ${type.nom}`, 45));
    const champ = new TextInputBuilder()
      .setCustomId('sujet')
      .setLabel('Raison de ta demande *')
      .setPlaceholder('Explique ta demande. Tu peux écrire plusieurs lignes.')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(400)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(champ));
    return interaction.showModal(modal);
  }

  // ── Assistant : menu principal ──
  if (id === 'tkt:main') {
    if (!estAdmin(interaction.member)) {
      return maj(interaction, { texte: '❌ Tu dois avoir la permission « Gérer le serveur ».' });
    }
    const valeur = interaction.values[0];
    const config = store.getGuild(guild.id);

    if (valeur === '__new__') return interaction.showModal(modalNouveauType());
    if (valeur === '__panel__') return interaction.showModal(modalPanel(config));

    if (valeur === '__reset__') {
      store.setGuild(guild.id, {
        panel: { titre: null, description: null, selecteur: null, image: null },
      });
      const cfg = store.getGuild(guild.id);
      return afficherMenu(interaction, '🧹 **Textes réinitialisés !** Le panneau affichera les textes complets par défaut. Clique sur « ✅ Terminer » pour republier le panneau.');
    }

    if (valeur === '__done__') {
      const cfg = store.getGuild(guild.id);
      if (!cfg.types.length) {
        return afficherMenu(interaction, '❌ Crée au moins un type avant de publier le panneau (« ➕ Nouveau type »).');
      }
      // On demande DANS QUEL SALON envoyer le panneau menu
      return maj(interaction, {
        couleur: 'info',
        titre: '📬 Sélectionne le salon où envoyer le panneau',
        texte: 'Le panneau du menu des types sera publié dans ce salon.',
        composants: [
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('tkt:panel-channel')
              .setPlaceholder('📬 Salon du panneau...')
              .setChannelTypes([ChannelType.GuildText])
              .setMinValues(1)
              .setMaxValues(1)
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tkt:panel-cancel').setLabel('Retour').setEmoji('⬅️').setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Un type a été choisi → assistant guidé, étape 1
    return afficherWizard(interaction, valeur, 'nom', null);
  }

  // ── Assistant : choix d'une catégorie pour un type ──
  if (id.startsWith('tkt:cat:')) {
    const typeId = id.split(':')[2];
    store.updateType(guild.id, typeId, { categoryId: interaction.values[0] });
    return afficherWizard(interaction, typeId, 'cat', '✅ Catégorie mise à jour.');
  }

  // ── Assistant : retrait de rôles staff d'un type ──
  if (id.startsWith('tkt:delroles:')) {
    const typeId = id.split(':')[2];
    const type = store.getType(guild.id, typeId);
    if (!type) return afficherMenu(interaction, '❌ Ce type n\'existe plus.');
    const restants = (type.staffRoleIds || []).filter(r => !interaction.values.includes(r));
    store.updateType(guild.id, typeId, { staffRoleIds: restants });
    return afficherWizard(interaction, typeId, 'roles', `✅ ${interaction.values.length} rôle(s) retiré(s).`);
  }

  // ── Assistant : ajout de rôles staff à un type ──
  if (id.startsWith('tkt:addroles:')) {
    const typeId = id.split(':')[2];
    const type = store.getType(guild.id, typeId);
    if (!type) return afficherMenu(interaction, '❌ Ce type n\'existe plus.');
    const actuel = new Set(type.staffRoleIds || []);
    for (const r of interaction.values) actuel.add(r);
    store.updateType(guild.id, typeId, { staffRoleIds: [...actuel] });
    return afficherWizard(interaction, typeId, 'roles', `✅ ${interaction.values.length} rôle(s) ajouté(s).`);
  }

  // ── /ticket panel : choix du panneau (MENU ou BOUTON) ──
  if (id === 'tkt:panel-choix') {
    if (!estAdmin(interaction.member)) {
      return maj(interaction, { texte: '❌ Tu dois avoir la permission « Gérer le serveur ».' });
    }
    const mode = interaction.values[0];
    store.setGuild(guild.id, { panelMode: mode });
    const cfg = store.getGuild(guild.id);
    if (!cfg.panelChannelId) {
      return maj(interaction, {
        couleur: 'info',
        titre: `📬 Dans quel salon envoyer le panneau ${mode === 'menu' ? '📋 MENU' : '🔘 BOUTON'} ?`,
        texte: 'Choisis un salon dans le menu ci-dessous.',
        composants: [rowSalonChoix()],
      });
    }
    return publierDepuisChoix(interaction, cfg);
  }

  // ── /ticket panel : choix du salon (si aucun salon configuré) ──
  if (id === 'tkt:panel-chan-choix') {
    if (!estAdmin(interaction.member)) {
      return maj(interaction, { texte: '❌ Tu dois avoir la permission « Gérer le serveur ».' });
    }
    const channelId = interaction.values[0];
    store.setGuild(guild.id, { panelChannelId: channelId, panelMessageId: null });
    return publierDepuisChoix(interaction, store.getGuild(guild.id));
  }

  // ── Assistant : choix du salon où envoyer le panneau menu ──
  if (id === 'tkt:panel-channel') {
    if (!estAdmin(interaction.member)) {
      return maj(interaction, { texte: '❌ Tu dois avoir la permission « Gérer le serveur ».' });
    }
    const channelId = interaction.values[0];
    store.setGuild(guild.id, { panelChannelId: channelId, panelMode: 'menu', panelMessageId: null });
    let cfg = store.getGuild(guild.id);
    // Catégorie / salon de logs manquants → créés automatiquement
    if (!cfg.categoryId || !cfg.logChannelId) {
      try {
        cfg = await preparerInfra(guild);
      } catch (erreur) {
        console.error('Erreur infrastructure :', erreur.message);
      }
    }
    const channel = await envoyerPanel(guild, cfg);
    return afficherMenu(
      interaction,
      channel
        ? `✅ **Panneau MENU publié dans <#${channelId}>** avec ${cfg.types.length} type(s) de tickets. Les membres peuvent maintenant ouvrir leurs tickets !`
        : `❌ Impossible d'envoyer le panneau dans <#${channelId}>. Vérifie que le bot a la permission d'y écrire.`
    );
  }

  // ── Sécurité : menu inconnu ou expiré → on répond quand même ──
  return repondre(interaction, { texte: '❌ Ce menu est expiré ou inconnu.' });
}

// ════════════════════════════════════════════════════════
// FORMULAIRES (MODALS)
// ════════════════════════════════════════════════════════
async function handleModal(interaction) {
  const guild = interaction.guild;
  const id = interaction.customId;

  // ── Fermeture d'un ticket : raison demandée dans le formulaire ──
  if (id === 'ticket:raison-fermeture') {
    const t = store.getTicket(guild.id, interaction.channel.id);
    if (!t) return repondre(interaction, { texte: '❌ Ce salon n\'est plus un ticket actif.' });
    const config = store.getGuild(guild.id);
    // Sécurité : la confirmation n'est possible que pour le staff du ticket
    if (!estStaffTicket(interaction.member, config, t)) {
      return repondre(interaction, { couleur: 'erreur', texte: '❌ Seul le staff de ce ticket peut le fermer.' });
    }
    const raison = nettoyerTexte(interaction.fields.getTextInputValue('raison'), 200) || 'Aucune raison donnée';
    // On garde la raison en mémoire jusqu'à la confirmation
    fermeturesEnAttente.set(interaction.channel.id, {
      raison,
      par: interaction.user.id,
      expire: Date.now() + DUREE_CONFIRMATION,
    });
    // CARTE DE CONFIRMATION : Confirmer / Annuler
    return repondre(interaction, {
      titre: '🔒 Confirmer la fermeture du ticket',
      lignes: [
        [
          `🎫 **Ticket** : #${t.numero}`,
          `📝 **Raison** : ${raison}`,
          `👮 **Fermé par** : <@${interaction.user.id}>`,
        ].join('\n'),
        '⚠️ Le salon sera **supprimé** et une transcription sera envoyée dans le salon de logs.',
      ],
      composants: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket:confirmer-fermeture')
            .setLabel('Confirmer la fermeture')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('ticket:annuler-fermeture')
            .setLabel('Annuler')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }

  // ── Renommage du ticket ──
  if (id === 'ticket:renommer-modal') {
    const config = store.getGuild(guild.id);
    const t = store.getTicket(guild.id, interaction.channel.id);
    if (!t) return repondre(interaction, { texte: '❌ Ce salon n\'est plus un ticket actif.' });
    if (!estStaffTicket(interaction.member, config, t)) {
      return repondre(interaction, { couleur: 'erreur', texte: '❌ Seul le staff de ce ticket peut le renommer.' });
    }
    const nom = slug(interaction.fields.getTextInputValue('nom'));
    if (!nom) {
      return repondre(interaction, { couleur: 'erreur', texte: 'Nom invalide : utilise des lettres et des chiffres.' });
    }
    const nouveau = coupe(`ticket-${t.numero}-${nom}`, 95);
    const ok = await interaction.channel.setName(nouveau).then(() => true).catch(() => false);
    if (!ok) {
      return repondre(interaction, {
        couleur: 'erreur',
        titre: 'Renommage impossible',
        texte: 'Je n\'ai pas la permission de renommer ce salon (« Gérer les salons »).',
      });
    }
    store.updateTicket(guild.id, interaction.channel.id, { nomPerso: nom });
    await interaction.channel
      .send(payload({
        ephemere: false,
        titre: '✏️ Ticket renommé',
        texte: `Nouveau nom : **${nouveau}**\n-# Renommé par <@${interaction.user.id}>`,
        allowedMentions: { parse: [] },
      }))
      .catch(() => {});
    return repondre(interaction, { couleur: 'succes', titre: '✅ Ticket renommé', texte: `Le salon s\'appelle maintenant **${nouveau}**.` });
  }

  // ── Ouverture d'un ticket simple (bouton) ──
  if (id === 'ticket:sujet') {
    const sujet = (interaction.fields.getTextInputValue('sujet') || '').trim();
    const resultat = await creerTicket(interaction, sujet, null);
    if (resultat.erreur) return repondre(interaction, { texte: `❌ ${resultat.erreur}` });
    return repondre(interaction, { couleur: 'succes', titre: 'Ton ticket est ouvert', texte: `Salon privé : <#${resultat.salon.id}>` });
  }

  // ── Ouverture d'un ticket par type ──
  if (id.startsWith('tkt:sujet:')) {
    const typeId = id.split(':')[2];
    const sujet = (interaction.fields.getTextInputValue('sujet') || '').trim();
    const resultat = await creerTicket(interaction, sujet, typeId);
    if (resultat.erreur) return repondre(interaction, { texte: `❌ ${resultat.erreur}` });
    return repondre(interaction, { couleur: 'succes', titre: 'Ton ticket est ouvert', texte: `Salon privé : <#${resultat.salon.id}>` });
  }

  // ── Assistant : nouveau type ──
  if (id === 'tkt:m-newtype') {
    if (!estAdmin(interaction.member)) {
      return maj(interaction, { texte: '❌ Tu dois avoir la permission « Gérer le serveur ».' });
    }
    const nom = (interaction.fields.getTextInputValue('nom') || '').trim();
    if (!nom) return maj(interaction, { texte: '❌ Nom du type obligatoire.' });
    const type = {
      id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      nom: coupe(nom, 45),
      emoji: null,
      description: null,
      categoryId: null,
      staffRoleIds: [],
    };
    store.addType(guild.id, type);
    return afficherWizard(interaction, type.id, 'nom', `✅ Type « ${type.nom} » créé — on le règle ensemble, étape par étape.`);
  }

  // ── Assistant : renommage / emoji / description d'un type ──
  if (id.startsWith('tkt:m-rename:') || id.startsWith('tkt:m-emoji:') || id.startsWith('tkt:m-desc:')) {
    if (!estAdmin(interaction.member)) {
      return maj(interaction, { texte: '❌ Tu dois avoir la permission « Gérer le serveur ».' });
    }
    const [kind, typeId] = [id.startsWith('tkt:m-rename:') ? 'rename' : id.startsWith('tkt:m-emoji:') ? 'emoji' : 'desc', id.split(':')[2]];
    const type = store.getType(guild.id, typeId);
    if (!type) return afficherMenu(interaction, '❌ Ce type n\'existe plus.');

    if (kind === 'rename') {
      const nom = (interaction.fields.getTextInputValue('nom') || '').trim();
      if (!nom) return afficherWizard(interaction, typeId, 'nom', '❌ Nom obligatoire.');
      store.updateType(guild.id, typeId, { nom: coupe(nom, 45) });
      return afficherWizard(interaction, typeId, 'nom', '✅ Type renommé.');
    }
    if (kind === 'emoji') {
      const emoji = (interaction.fields.getTextInputValue('emoji') || '').trim();
      store.updateType(guild.id, typeId, { emoji: emoji || null });
      return afficherWizard(interaction, typeId, 'emoji', '✅ Emoji mis à jour.');
    }
    const desc = (interaction.fields.getTextInputValue('desc') || '').trim();
    store.updateType(guild.id, typeId, { description: desc || null });
    return afficherWizard(interaction, typeId, 'desc', '✅ Description mise à jour.');
  }

  // ── Assistant : textes du panneau ──
  if (id === 'tkt:m-panel') {
    if (!estAdmin(interaction.member)) {
      return maj(interaction, { texte: '❌ Tu dois avoir la permission « Gérer le serveur ».' });
    }
    const titre = (interaction.fields.getTextInputValue('titre') || '').trim();
    const description = (interaction.fields.getTextInputValue('description') || '').trim();
    const selecteur = (interaction.fields.getTextInputValue('selecteur') || '').trim();
    const image = (interaction.fields.getTextInputValue('image') || '').trim();
    store.setGuild(guild.id, {
      panel: {
        titre: titre || null,
        description: description || null,
        selecteur: selecteur || null,
        image: /^https?:\/\//.test(image) ? image : null,
      },
    });
    const config = store.getGuild(guild.id);
    return afficherMenu(interaction, '✅ Textes du panneau enregistrés. Pense à cliquer sur « ✅ Terminer » pour publier le panneau.');
  }

  // ─── Sécurité : formulaire inconnu ou expiré → on répond quand même ───
  return repondre(interaction, { texte: '❌ Ce formulaire est expiré ou inconnu.' });
}

module.exports = {
  preparerInfra,
  purgerTicketsFantomes,
  ticketOuvertReel,
  permissionsManquantes,
  creerTicket,
  fermerTicket,
  embedPanneau,
  construirePanneau,
  rowTypes,
  boutonOuvrir,
  embedTicket,
  carteTicket,
  rafraichirCartesTickets,
  payloadTicket,
  boutonsTicket,
  envoyerPanel,
  menuChoixPanneau,
  menuRoles,
  estStaff,
  estStaffTicket,
  rafraichirMessageTicket,
  menuPrincipal,
  configBouton,
  modePanneau,
  embedAssistant,
  rowAssistant,
  embedWizard,
  rowWizard,
  handleButton,
  handleSelectMenu,
  handleModal,
};
