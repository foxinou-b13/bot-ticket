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
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const store = require('../utils/store');

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

function embedPanneau(config, options = {}) {
  const p = config.panel || {};
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(coupe(options.titre || p.titre || '🎫 Support', 256))
    .setDescription(
      coupe(
        options.description ||
          p.description ||
          (config.types.length
            ? 'Bienvenue sur le support du serveur.\nPour ouvrir un ticket, **sélectionne le type de ta demande** dans le menu ci-dessous.'
            : "Besoin d'aide ? Clique sur le bouton **🎫 Ouvrir un ticket** ci-dessous.\nUn salon privé sera créé pour toi et notre équipe."),
        4096
      )
    )
    .setFooter({ text: 'Système de tickets' });
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

function construirePanneau(config, options = {}) {
  if (config.types.length > 0) {
    return { embeds: [embedPanneau(config, options)], components: [rowTypes(config)] };
  }
  return { embeds: [embedPanneau(config, options)], components: [boutonOuvrir()] };
}

// Envoie (ou met à jour) le panneau dans le salon configuré
async function envoyerPanel(guild, config, options = {}) {
  let channel = null;
  if (config.panelChannelId) {
    channel = await guild.channels.fetch(config.panelChannelId).catch(() => null);
  }
  if (!channel) return null;

  // Si un panneau existe déjà, on le met à jour au lieu d'en empiler
  let message = null;
  if (config.panelMessageId) {
    message = await channel.messages.fetch(config.panelMessageId).catch(() => null);
  }
  const contenu = construirePanneau(config, options);
  if (message) {
    await message.edit(contenu).catch(async () => {
      message = await channel.send(contenu);
    });
  } else {
    message = await channel.send(contenu);
  }
  store.setGuild(guild.id, { panelMessageId: message.id, panelSent: true });
  return channel;
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
    .setColor(0x5865F2)
    .setTitle('📋 Assistant des types de tickets')
    .setDescription(
      [
        'Choisis un type à modifier, crée-en un nouveau, ou termine.',
        '',
        `🔹 **Types actuels (${config.types.length})**`,
        ...lignes,
        '',
        '🎨 **Textes du panneau** : titre, description et texte du sélecteur.',
        '✅ **Terminer** : publie le panneau (avec le menu des types) dans le salon du panneau.',
      ].join('\n')
    );
}

function rowAssistant(config) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('tkt:main')
    .setPlaceholder('Choisissez un type...')
    .setMinValues(1)
    .setMaxValues(1);
  for (const type of config.types.slice(0, 22)) {
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
      .setDescription('Titre, description, texte du sélecteur'),
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
    return interaction.reply({ content: '❌ Tu dois avoir la permission « Gérer le serveur ».', ephemeral: true });
  }
  const config = store.getGuild(interaction.guild.id);
  return interaction.reply({
    embeds: [embedAssistant(config)],
    components: [rowAssistant(config)],
    ephemeral: true,
  });
}

// Résumé d'un type + menu des actions (comme un petit réglage par type)
function embedType(type, config) {
  const cat = type.categoryId
    ? `<#${type.categoryId}>`
    : config.categoryId
      ? `<#${config.categoryId}> (par défaut)`
      : '❌ aucune';
  const roles = (type.staffRoleIds || []).length
    ? type.staffRoleIds.map(id => `<@&${id}>`).join(', ')
    : 'aucun — les rôles staff du serveur seront utilisés';
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${type.emoji ? type.emoji + ' ' : ''}${coupe(type.nom, 200)}`)
    .setDescription('Choisissez une action :')
    .addFields(
      { name: '😄 Emoji', value: type.emoji || 'aucun', inline: true },
      { name: '📁 Catégorie', value: cat, inline: true },
      { name: '📝 Description', value: type.description ? coupe(type.description, 500) : 'aucune' },
      { name: `🛡️ Rôles staff (${(type.staffRoleIds || []).length})`, value: coupe(roles, 1000) }
    );
}

function rowActions(typeId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`tkt:actions:${typeId}`)
    .setPlaceholder('Action...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Renommer').setEmoji('✏️').setValue('rename'),
      new StringSelectMenuOptionBuilder().setLabel("Changer l'emoji").setEmoji('😄').setValue('emoji'),
      new StringSelectMenuOptionBuilder().setLabel('Description du type').setEmoji('📝').setValue('desc'),
      new StringSelectMenuOptionBuilder().setLabel('Changer la catégorie').setEmoji('📁').setValue('cat'),
      new StringSelectMenuOptionBuilder().setLabel('Ajouter un rôle staff').setEmoji('➕').setValue('addroles'),
      new StringSelectMenuOptionBuilder().setLabel('Retirer un rôle staff').setEmoji('➖').setValue('delroles'),
      new StringSelectMenuOptionBuilder().setLabel('Supprimer ce type').setEmoji('🗑️').setValue('delete'),
      new StringSelectMenuOptionBuilder().setLabel('Retour').setEmoji('⬅️').setValue('back')
    );
  return new ActionRowBuilder().addComponents(menu);
}

async function afficherEditeur(interaction, typeId, note) {
  const config = store.getGuild(interaction.guild.id);
  const type = store.getType(interaction.guild.id, typeId);
  if (!type) {
    const contenu = { embeds: [embedAssistant(config)], components: [rowAssistant(config)] };
    return interaction.replied || interaction.deferred
      ? interaction.editReply(contenu)
      : interaction.update(contenu);
  }
  const contenu = {
    content: note || null,
    embeds: [embedType(type, config)],
    components: [rowActions(typeId)],
  };
  if (interaction.replied || interaction.deferred) return interaction.editReply(contenu);
  return interaction.update(contenu);
}

async function afficherMenu(interaction, note) {
  const config = store.getGuild(interaction.guild.id);
  const contenu = {
    content: note || null,
    embeds: [embedAssistant(config)],
    components: [rowAssistant(config)],
  };
  if (interaction.replied || interaction.deferred) return interaction.editReply(contenu);
  return interaction.update(contenu);
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
  modal.addComponents(
    new ActionRowBuilder().addComponents(titre),
    new ActionRowBuilder().addComponents(description),
    new ActionRowBuilder().addComponents(selecteur)
  );
  return modal;
}

// ─── À l'intérieur d'un ticket ───
function boutonsTicket(t) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:reclamer')
      .setLabel(t.claimedBy ? 'Pris en charge' : 'Prendre en charge')
      .setEmoji('🔔')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!!t.claimedBy),
    new ButtonBuilder()
      .setCustomId('ticket:fermer')
      .setLabel('Fermer le ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );
}

function embedTicket(t) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🎫 Ticket #${t.numero}`)
    .addFields(
      { name: 'Ouvert par', value: `<@${t.userId}>`, inline: true },
      {
        name: 'Statut',
        value: t.claimedBy ? `Pris en charge par <@${t.claimedBy}>` : '⏳ En attente du staff',
        inline: true,
      }
    )
    .setFooter({ text: 'Utilise les boutons ci-dessous' })
    .setTimestamp(t.createdAt);
  if (t.typeNom) embed.addFields({ name: 'Type', value: `${t.typeEmoji ? t.typeEmoji + ' ' : ''}${t.typeNom}`, inline: true });
  if (t.sujet) embed.setDescription(`**Sujet :** ${t.sujet}`);
  return embed;
}

// Met à jour le message d'accroche du ticket (embed + boutons)
async function rafraichirMessageTicket(interaction, t) {
  try {
    const message = await interaction.channel.messages.fetch(t.messageId);
    await message.edit({ embeds: [embedTicket(t)], components: [boutonsTicket(t)] });
  } catch {
    // Le message a peut-être été supprimé : on ignore.
  }
}

// ─── Ouverture d'un ticket (bouton OU type du menu) ───
async function creerTicket(interaction, sujet, typeId) {
  const guild = interaction.guild;
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

  const existant = store.findTicketByUser(guild.id, interaction.user.id);
  if (existant) {
    return { erreur: `Tu as déjà un ticket ouvert : <#${existant.channelId}>` };
  }

  const numero = store.prochainNumero(guild.id);
  const base = type ? type.nom : sujet;
  const suffixe = `-${slug(base) || 'ticket'}`;

  // Salon privé : seul le membre, LES rôles staff du type et le bot le voient
  const permissions = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
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

  const salon = await guild.channels.create({
    name: coupe(`ticket-${numero}${suffixe}`, 95),
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: permissions,
  });

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

  const mentions = staffRoleIds.map(id => `<@&${id}>`).join(' ');
  const message = await salon.send({
    content: `<@${interaction.user.id}> ${mentions}`,
    embeds: [embedTicket(infos)],
    components: [boutonsTicket(infos)],
  });
  infos.messageId = message.id;
  store.addTicket(guild.id, salon.id, infos);

  await message.pin().catch(() => {}); // Épingler si le bot en a le droit

  return { salon };
}

// ─── Fermeture d'un ticket ───
async function fermerTicket(interaction, t, raison) {
  const guild = interaction.guild;
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
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`🔒 Ticket #${t.numero} fermé`)
        .addFields(
          { name: 'Ouvert par', value: `<@${t.userId}>`, inline: true },
          { name: 'Fermé par', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Raison', value: raison || 'Aucune' }
        )
        .setTimestamp();
      if (t.typeNom) embed.addFields({ name: 'Type', value: `${t.typeEmoji ? t.typeEmoji + ' ' : ''}${t.typeNom}`, inline: true });
      await logChannel
        .send({
          embeds: [embed],
          files: [{ attachment: Buffer.from(lignes.slice(0, 3900), 'utf8'), name: `ticket-${t.numero}.txt` }],
        })
        .catch(() => {});
    }
  }

  // MP à l'auteur du ticket
  const auteur = await interaction.client.users.fetch(t.userId).catch(() => null);
  if (auteur) {
    await auteur
      .send(`🔒 Ton ticket #${t.numero} sur **${guild.name}** a été fermé.${raison ? `\nRaison : ${raison}` : ''}`)
      .catch(() => {});
  }

  store.removeTicket(guild.id, interaction.channel.id);
  await interaction.channel.send('🔒 Fermeture du ticket dans 5 secondes...');
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

// ════════════════════════════════════════════════════════
// BOUTONS
// ════════════════════════════════════════════════════════
async function handleButton(interaction) {
  const guild = interaction.guild;
  const config = store.getGuild(guild.id);

  // Bouton du panneau → on demande le sujet
  if (interaction.customId === 'ticket:ouvrir') {
    const modal = new ModalBuilder().setCustomId('ticket:sujet').setTitle('🎫 Ouvrir un ticket');
    const champ = new TextInputBuilder()
      .setCustomId('sujet')
      .setLabel('Quel est ton problème ? (facultatif)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(50)
      .setRequired(false);
    modal.addComponents(new ActionRowBuilder().addComponents(champ));
    return interaction.showModal(modal);
  }

  // Prise en charge par le staff
  if (interaction.customId === 'ticket:reclamer') {
    const t = store.getTicket(guild.id, interaction.channel.id);
    if (!t) return interaction.reply({ content: '❌ Ce salon n\'est plus un ticket actif.', ephemeral: true });
    if (!estStaffTicket(interaction.member, config, t)) {
      return interaction.reply({ content: '❌ Seul le staff peut prendre en charge un ticket.', ephemeral: true });
    }
    if (t.claimedBy) {
      return interaction.reply({ content: `Ce ticket est déjà pris en charge par <@${t.claimedBy}>.`, ephemeral: true });
    }
    const maj = store.updateTicket(guild.id, interaction.channel.id, { claimedBy: interaction.user.id });
    await interaction.update({ embeds: [embedTicket(maj)], components: [boutonsTicket(maj)] });
    return interaction.channel.send(`🔔 <@${interaction.user.id}> a pris en charge ce ticket.`);
  }

  // Demande de fermeture → confirmation
  if (interaction.customId === 'ticket:fermer') {
    const t = store.getTicket(guild.id, interaction.channel.id);
    if (!t) return interaction.reply({ content: '❌ Ce salon n\'est plus un ticket actif.', ephemeral: true });
    const ligne = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket:confirmer-fermeture').setLabel('Oui, fermer').setEmoji('🔒').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket:annuler').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({
      content: '⚠️ Fermer ce ticket ? Le salon sera supprimé.',
      components: [ligne],
      ephemeral: true,
    });
  }

  if (interaction.customId === 'ticket:confirmer-fermeture') {
    const t = store.getTicket(guild.id, interaction.channel.id);
    if (!t) return interaction.update({ content: '❌ Ticket déjà fermé.', components: [] });
    await interaction.update({ content: '🔒 Fermeture en cours...', components: [] });
    return fermerTicket(interaction, t, 'Fermeture via le bouton');
  }

  if (interaction.customId === 'ticket:annuler') {
    return interaction.update({ content: '✅ Annulé, le ticket reste ouvert.', components: [] });
  }
}

// ════════════════════════════════════════════════════════
// MENUS DÉROULANTS
// ════════════════════════════════════════════════════════
async function handleSelectMenu(interaction) {
  const guild = interaction.guild;
  const id = interaction.customId;

  // ── Étape finale de /ticket setup : choix des rôles staff ──
  if (id === 'ticket:select-roles') {
    const roles = interaction.values;
    store.setGuild(guild.id, { staffRoleIds: roles });
    const config = store.getGuild(guild.id);

    let logChannelId = config.logChannelId;
    if (!logChannelId && config.categoryId) {
      const permissions = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }];
      for (const roleId of roles) {
        permissions.push({
          id: roleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
      }
      const logs = await guild.channels.create({
        name: 'tickets-logs',
        type: ChannelType.GuildText,
        parent: config.categoryId,
        permissionOverwrites: permissions,
      });
      logChannelId = logs.id;
      store.setGuild(guild.id, { logChannelId });
    }

    let panelEnvoye = false;
    if (!config.panelSent) {
      const channel = await envoyerPanel(guild, store.getGuild(guild.id));
      if (channel) panelEnvoye = true;
    }

    const liste = roles.map(r => `<@&${r}>`).join(', ');
    const cfg = store.getGuild(guild.id);

    return interaction.update({
      content: [
        '✅ **Système de tickets configuré automatiquement !**',
        '',
        `👥 Rôles staff (${roles.length}) : ${liste}`,
        `📁 Catégorie : <#${cfg.categoryId}>`,
        `📜 Salon de logs : ${cfg.logChannelId ? `<#${cfg.logChannelId}>` : '—'}`,
        `🎫 Panneau : ${panelEnvoye ? 'envoyé ✅' : 'déjà en place (utilise `/ticket panel` pour le renvoyer)'}`,
        '',
        '🧩 **Prochaine étape (facultative mais recommandée) :** `/setup ticket menu`',
        '→ crée tes **types de tickets** (emoji, catégorie, rôles staff par type) et personnalise le panneau.',
      ].join('\n'),
      components: [],
    });
  }

  // ── Panneau public : un membre choisit un type → formulaire ──
  if (id === 'tkt:type-ouvrir') {
    const typeId = interaction.values[0];
    const type = store.getType(guild.id, typeId);
    if (!type) {
      return interaction.reply({ content: '❌ Ce type de ticket n\'existe plus. Le panneau va être mis à jour.', ephemeral: true });
    }
    const modal = new ModalBuilder()
      .setCustomId(`tkt:sujet:${typeId}`)
      .setTitle(coupe(`🎫 ${type.nom}`, 45));
    const champ = new TextInputBuilder()
      .setCustomId('sujet')
      .setLabel('Décris ta demande (facultatif)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(false);
    modal.addComponents(new ActionRowBuilder().addComponents(champ));
    return interaction.showModal(modal);
  }

  // ── Assistant : menu principal ──
  if (id === 'tkt:main') {
    if (!estAdmin(interaction.member)) {
      return interaction.update({ content: '❌ Tu dois avoir la permission « Gérer le serveur ».', components: [] });
    }
    const valeur = interaction.values[0];
    const config = store.getGuild(guild.id);

    if (valeur === '__new__') return interaction.showModal(modalNouveauType());
    if (valeur === '__panel__') return interaction.showModal(modalPanel(config));

    if (valeur === '__done__') {
      const cfg = store.getGuild(guild.id);
      if (!cfg.types.length) {
        return interaction.update({
          content: '❌ Crée au moins un type avant de publier le panneau (« ➕ Nouveau type »).',
          embeds: [embedAssistant(cfg)],
          components: [rowAssistant(cfg)],
        });
      }
      if (!cfg.panelChannelId) {
        return interaction.update({
          content: '❌ Aucun salon de panneau configuré. Fais d\'abord `/ticket setup`.',
          embeds: [embedAssistant(cfg)],
          components: [rowAssistant(cfg)],
        });
      }
      const channel = await envoyerPanel(guild, cfg);
      return interaction.update({
        content: `✅ **Panneau publié dans ${channel}** avec ${cfg.types.length} type(s) de tickets.\nTu peux continuer à modifier les types : le panneau se mettra à jour automatiquement.`,
        embeds: [embedAssistant(cfg)],
        components: [rowAssistant(cfg)],
      });
    }

    // Un type a été choisi → éditeur
    return afficherEditeur(interaction, valeur, null);
  }

  // ── Assistant : actions d'un type ──
  if (id.startsWith('tkt:actions:')) {
    if (!estAdmin(interaction.member)) {
      return interaction.update({ content: '❌ Tu dois avoir la permission « Gérer le serveur ».', components: [] });
    }
    const typeId = id.split(':')[2];
    const action = interaction.values[0];
    const type = store.getType(guild.id, typeId);
    if (!type) return afficherMenu(interaction, '❌ Ce type n\'existe plus.');

    if (action === 'back') return afficherMenu(interaction, null);

    if (action === 'rename') return interaction.showModal(modalTypeChamp(type, 'rename'));
    if (action === 'emoji') return interaction.showModal(modalTypeChamp(type, 'emoji'));
    if (action === 'desc') return interaction.showModal(modalTypeChamp(type, 'desc'));

    if (action === 'cat') {
      return interaction.update({
        content: `📁 **Catégorie du type « ${type.nom} »** — choisis la catégorie où ses tickets seront créés :`,
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId(`tkt:cat:${typeId}`)
              .setPlaceholder('📁 Choisis la catégorie de ce type')
              .setChannelTypes([ChannelType.GuildCategory])
              .setMinValues(1)
              .setMaxValues(1)
          ),
        ],
      });
    }

    if (action === 'addroles') {
      return interaction.update({
        content: `➕ **Rôles staff du type « ${type.nom} »** — choisis un ou plusieurs rôles :`,
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder()
              .setCustomId(`tkt:addroles:${typeId}`)
              .setPlaceholder('🛡️ Ajoute un ou plusieurs rôles staff')
              .setMinValues(1)
              .setMaxValues(10)
          ),
        ],
      });
    }

    if (action === 'delroles') {
      if (!(type.staffRoleIds || []).length) {
        return afficherEditeur(interaction, typeId, '❌ Ce type n\'a aucun rôle staff propre à retirer.');
      }
      return interaction.update({
        content: `➖ **Retirer des rôles staff du type « ${type.nom} »** — choisis le(s) rôle(s) à retirer :`,
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder()
              .setCustomId(`tkt:delroles:${typeId}`)
              .setPlaceholder('🛡️ Retire un ou plusieurs rôles staff')
              .setMinValues(1)
              .setMaxValues(10)
          ),
        ],
      });
    }

    if (action === 'delete') {
      const nom = type.nom;
      store.removeType(guild.id, typeId);
      return afficherMenu(interaction, `🗑️ Type « ${nom} » supprimé.`);
    }
    return afficherEditeur(interaction, typeId, null);
  }

  // ── Assistant : choix d'une catégorie pour un type ──
  if (id.startsWith('tkt:cat:')) {
    const typeId = id.split(':')[2];
    store.updateType(guild.id, typeId, { categoryId: interaction.values[0] });
    return afficherEditeur(interaction, typeId, '✅ Catégorie mise à jour.');
  }

  // ── Assistant : ajout de rôles staff à un type ──
  if (id.startsWith('tkt:addroles:')) {
    const typeId = id.split(':')[2];
    const type = store.getType(guild.id, typeId);
    if (!type) return afficherMenu(interaction, '❌ Ce type n\'existe plus.');
    const actuel = new Set(type.staffRoleIds || []);
    for (const r of interaction.values) actuel.add(r);
    store.updateType(guild.id, typeId, { staffRoleIds: [...actuel] });
    return afficherEditeur(interaction, typeId, `✅ ${interaction.values.length} rôle(s) ajouté(s).`);
  }

  // ── Assistant : retrait de rôles staff d'un type ──
  if (id.startsWith('tkt:delroles:')) {
    const typeId = id.split(':')[2];
    const type = store.getType(guild.id, typeId);
    if (!type) return afficherMenu(interaction, '❌ Ce type n\'existe plus.');
    const aRetirer = new Set(interaction.values);
    store.updateType(guild.id, typeId, {
      staffRoleIds: (type.staffRoleIds || []).filter(r => !aRetirer.has(r)),
    });
    return afficherEditeur(interaction, typeId, `✅ ${interaction.values.length} rôle(s) retiré(s).`);
  }
}

// ════════════════════════════════════════════════════════
// FORMULAIRES (MODALS)
// ════════════════════════════════════════════════════════
async function handleModal(interaction) {
  const guild = interaction.guild;
  const id = interaction.customId;

  // ── Ouverture d'un ticket simple (bouton) ──
  if (id === 'ticket:sujet') {
    const sujet = (interaction.fields.getTextInputValue('sujet') || '').trim();
    const resultat = await creerTicket(interaction, sujet, null);
    if (resultat.erreur) return interaction.reply({ content: `❌ ${resultat.erreur}`, ephemeral: true });
    return interaction.reply({ content: `✅ Ton ticket est ouvert : ${resultat.salon}`, ephemeral: true });
  }

  // ── Ouverture d'un ticket par type ──
  if (id.startsWith('tkt:sujet:')) {
    const typeId = id.split(':')[2];
    const sujet = (interaction.fields.getTextInputValue('sujet') || '').trim();
    const resultat = await creerTicket(interaction, sujet, typeId);
    if (resultat.erreur) return interaction.reply({ content: `❌ ${resultat.erreur}`, ephemeral: true });
    return interaction.reply({ content: `✅ Ton ticket est ouvert : ${resultat.salon}`, ephemeral: true });
  }

  // ── Assistant : nouveau type ──
  if (id === 'tkt:m-newtype') {
    if (!estAdmin(interaction.member)) {
      return interaction.update({ content: '❌ Tu dois avoir la permission « Gérer le serveur ».', components: [] });
    }
    const nom = (interaction.fields.getTextInputValue('nom') || '').trim();
    if (!nom) return interaction.update({ content: '❌ Nom du type obligatoire.', components: [] });
    const type = {
      id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      nom: coupe(nom, 45),
      emoji: null,
      description: null,
      categoryId: null,
      staffRoleIds: [],
    };
    store.addType(guild.id, type);
    return afficherEditeur(interaction, type.id, `✅ Type « ${type.nom} » créé — règle-le ci-dessous.`);
  }

  // ── Assistant : renommage / emoji / description d'un type ──
  if (id.startsWith('tkt:m-rename:') || id.startsWith('tkt:m-emoji:') || id.startsWith('tkt:m-desc:')) {
    if (!estAdmin(interaction.member)) {
      return interaction.update({ content: '❌ Tu dois avoir la permission « Gérer le serveur ».', components: [] });
    }
    const [kind, typeId] = [id.startsWith('tkt:m-rename:') ? 'rename' : id.startsWith('tkt:m-emoji:') ? 'emoji' : 'desc', id.split(':')[2]];
    const type = store.getType(guild.id, typeId);
    if (!type) return afficherMenu(interaction, '❌ Ce type n\'existe plus.');

    if (kind === 'rename') {
      const nom = (interaction.fields.getTextInputValue('nom') || '').trim();
      if (!nom) return afficherEditeur(interaction, typeId, '❌ Nom obligatoire.');
      store.updateType(guild.id, typeId, { nom: coupe(nom, 45) });
      return afficherEditeur(interaction, typeId, '✅ Type renommé.');
    }
    if (kind === 'emoji') {
      const emoji = (interaction.fields.getTextInputValue('emoji') || '').trim();
      store.updateType(guild.id, typeId, { emoji: emoji || null });
      return afficherEditeur(interaction, typeId, '✅ Emoji mis à jour.');
    }
    const desc = (interaction.fields.getTextInputValue('desc') || '').trim();
    store.updateType(guild.id, typeId, { description: desc || null });
    return afficherEditeur(interaction, typeId, '✅ Description mise à jour.');
  }

  // ── Assistant : textes du panneau ──
  if (id === 'tkt:m-panel') {
    if (!estAdmin(interaction.member)) {
      return interaction.update({ content: '❌ Tu dois avoir la permission « Gérer le serveur ».', components: [] });
    }
    const titre = (interaction.fields.getTextInputValue('titre') || '').trim();
    const description = (interaction.fields.getTextInputValue('description') || '').trim();
    const selecteur = (interaction.fields.getTextInputValue('selecteur') || '').trim();
    store.setGuild(guild.id, {
      panel: {
        titre: titre || null,
        description: description || null,
        selecteur: selecteur || null,
      },
    });
    const config = store.getGuild(guild.id);
    return interaction.update({
      content: '✅ Textes du panneau enregistrés. Pense à cliquer sur « ✅ Terminer » pour publier le panneau.',
      embeds: [embedAssistant(config)],
      components: [rowAssistant(config)],
    });
  }
}

module.exports = {
  creerTicket,
  fermerTicket,
  embedPanneau,
  boutonOuvrir,
  embedTicket,
  boutonsTicket,
  envoyerPanel,
  menuRoles,
  estStaff,
  estStaffTicket,
  rafraichirMessageTicket,
  menuPrincipal,
  handleButton,
  handleSelectMenu,
  handleModal,
};
