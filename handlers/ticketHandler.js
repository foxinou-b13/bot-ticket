/**
 * handlers/ticketHandler.js
 * Toute la logique du système de tickets :
 * panneau, ouverture, prise en charge, ajout/retrait de membres, fermeture.
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
} = require('discord.js');
const store = require('../utils/store');

// ─── Panneau "Ouvrir un ticket" ───
function boutonOuvrir() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:ouvrir')
      .setLabel('Ouvrir un ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Success)
  );
}

function embedPanel(titre, description) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(titre || '🎫 Ouvrir un ticket')
    .setDescription(
      description ||
        "Besoin d'aide ? Clique sur le bouton **🎫 Ouvrir un ticket** ci-dessous.\n" +
        'Un salon privé sera créé pour toi et notre équipe.'
    )
    .setFooter({ text: 'Système de tickets' });
}

// Envoie le panneau dans le salon configuré
async function envoyerPanel(guild, config, options = {}) {
  let channel = null;
  if (config.panelChannelId) {
    channel = await guild.channels.fetch(config.panelChannelId).catch(() => null);
  }
  if (!channel) return null;
  await channel.send({
    embeds: [embedPanel(options.titre, options.description)],
    components: [boutonOuvrir()],
  });
  return channel;
}

// Menu de sélection des rôles staff (PLUSIEURS rôles possibles)
function menuRoles() {
  return new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('ticket:select-roles')
      .setPlaceholder('👥 Choisis le(s) rôle(s) du staff')
      .setMinValues(1)
      .setMaxValues(10)
  );
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
  if (t.sujet) embed.setDescription(`**Sujet :** ${t.sujet}`);
  return embed;
}

// Vérifie si un membre fait partie du staff (un des rôles choisis)
function estStaff(member, config) {
  return config.staffRoleIds.some(roleId => member.roles.cache.has(roleId));
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

// ─── Ouverture d'un ticket ───
async function creerTicket(interaction, sujet) {
  const guild = interaction.guild;
  const config = store.getGuild(guild.id);

  if (!config.categoryId || config.staffRoleIds.length === 0) {
    return {
      erreur: "Le système de tickets n'est pas configuré. Un administrateur doit faire `/ticket setup`.",
    };
  }

  const existant = store.findTicketByUser(guild.id, interaction.user.id);
  if (existant) {
    return { erreur: `Tu as déjà un ticket ouvert : <#${existant.channelId}>` };
  }

  const numero = store.prochainNumero(guild.id);
  const suffixe = sujet
    ? `-${sujet.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20)}`
    : '';

  // Salon privé : seul le membre, TOUS les rôles staff et le bot le voient
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
  for (const roleId of config.staffRoleIds) {
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
    name: `ticket-${numero}${suffixe}`,
    type: ChannelType.GuildText,
    parent: config.categoryId,
    permissionOverwrites: permissions,
  });

  const infos = {
    numero,
    userId: interaction.user.id,
    sujet: sujet || null,
    claimedBy: null,
    createdAt: Date.now(),
  };

  const mentions = config.staffRoleIds.map(id => `<@&${id}>`).join(' ');
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
      await logChannel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle(`🔒 Ticket #${t.numero} fermé`)
              .addFields(
                { name: 'Ouvert par', value: `<@${t.userId}>`, inline: true },
                { name: 'Fermé par', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Raison', value: raison || 'Aucune' }
              )
              .setTimestamp(),
          ],
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

// ─── Boutons ───
async function handleButton(interaction) {
  const guild = interaction.guild;
  const config = store.getGuild(guild.id);

  // Bouton du panneau → on demande le sujet
  if (interaction.customId === 'ticket:ouvrir') {
    const modal = new ModalBuilder().setCustomId('ticket:sujet').setTitle('Ouvrir un ticket');
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
    if (!estStaff(interaction.member, config)) {
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

// ─── Menu de sélection des rôles staff ───
async function handleSelectMenu(interaction) {
  if (interaction.customId !== 'ticket:select-roles') return;

  const guild = interaction.guild;
  const roles = interaction.values; // IDs des rôles sélectionnés (plusieurs possibles)
  store.setGuild(guild.id, { staffRoleIds: roles });
  const config = store.getGuild(guild.id);

  // Salon de logs : création automatique si pas encore défini
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

  // Envoi du panneau (une seule fois)
  let panelEnvoye = false;
  if (!config.panelSent) {
    const channel = await envoyerPanel(guild, store.getGuild(guild.id));
    if (channel) {
      store.setGuild(guild.id, { panelSent: true });
      panelEnvoye = true;
    }
  }

  const liste = roles.map(id => `<@&${id}>`).join(', ');
  const cfg = store.getGuild(guild.id);

  await interaction.update({
    content: [
      '✅ **Système de tickets configuré automatiquement !**',
      '',
      `👥 Rôles staff (${roles.length}) : ${liste}`,
      `📁 Catégorie : <#${cfg.categoryId}>`,
      `📜 Salon de logs : ${cfg.logChannelId ? `<#${cfg.logChannelId}>` : '—'}`,
      `🎫 Panneau : ${panelEnvoye ? 'envoyé ✅' : 'déjà en place (utilise `/ticket panel` pour le renvoyer)'}`,
      '',
      '🎉 **C\'est terminé !** Les membres peuvent maintenant cliquer sur le bouton **🎫 Ouvrir un ticket**.',
    ].join('\n'),
    components: [],
  });
}

// ─── Formulaire "sujet du ticket" ───
async function handleModal(interaction) {
  if (interaction.customId !== 'ticket:sujet') return;
  const sujet = (interaction.fields.getTextInputValue('sujet') || '').trim();
  const resultat = await creerTicket(interaction, sujet);
  if (resultat.erreur) return interaction.reply({ content: `❌ ${resultat.erreur}`, ephemeral: true });
  return interaction.reply({ content: `✅ Ton ticket est ouvert : ${resultat.salon}`, ephemeral: true });
}

module.exports = {
  creerTicket,
  fermerTicket,
  embedPanel,
  boutonOuvrir,
  embedTicket,
  boutonsTicket,
  envoyerPanel,
  menuRoles,
  estStaff,
  rafraichirMessageTicket,
  handleButton,
  handleSelectMenu,
  handleModal,
};
