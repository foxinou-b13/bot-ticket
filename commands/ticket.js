/**
 * commands/ticket.js — la commande /ticket et toutes ses sous-commandes
 *
 * /ticket setup    → configuration 100% automatique (catégorie, salons, panneau)
 * /ticket panel    → envoyer le panneau "Ouvrir un ticket"
 * /ticket config   → voir la configuration
 * /ticket claim    → prendre en charge un ticket
 * /ticket add      → ajouter un membre au ticket
 * /ticket remove   → retirer un membre du ticket
 * /ticket close    → fermer le ticket
 */
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const store = require('../utils/store');
const handler = require('../handlers/ticketHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Système de tickets du serveur')
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Configure tout automatiquement (catégorie, salons, panneau, rôles staff)')
        .addChannelOption(o =>
          o.setName('categorie').setDescription('Catégorie des tickets (créée automatiquement si vide)').addChannelTypes(ChannelType.GuildCategory)
        )
        .addChannelOption(o =>
          o.setName('salon').setDescription('Salon du panneau (créé automatiquement si vide)').addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(o =>
          o.setName('salon_logs').setDescription('Salon des transcriptions (créé automatiquement si vide)').addChannelTypes(ChannelType.GuildText)
        )
        .addRoleOption(o =>
          o.setName('role_staff').setDescription('Rôle staff (sinon, un menu permettra d\'en choisir plusieurs)')
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Envoyer le panneau (menu des types si des types existent)')
        .addChannelOption(o => o.setName('salon').setDescription('Salon où envoyer le panneau').addChannelTypes(ChannelType.GuildText))
        .addStringOption(o => o.setName('titre').setDescription('Titre du panneau'))
        .addStringOption(o => o.setName('description').setDescription('Description du panneau'))
    )
    .addSubcommand(sub => sub.setName('config').setDescription('Voir la configuration actuelle des tickets'))
    .addSubcommand(sub => sub.setName('claim').setDescription('Prendre en charge le ticket actuel (staff)'))
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Ajouter un membre au ticket actuel')
        .addUserOption(o => o.setName('membre').setDescription('Le membre à ajouter').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Retirer un membre du ticket actuel')
        .addUserOption(o => o.setName('membre').setDescription('Le membre à retirer').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('close')
        .setDescription('Fermer le ticket actuel')
        .addStringOption(o => o.setName('raison').setDescription('La raison de la fermeture'))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const config = store.getGuild(guild.id);
    const estAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

    // ════════════════════════════════════════════════════
    // /ticket setup — CONFIGURATION 100% AUTOMATIQUE
    // ════════════════════════════════════════════════════
    if (sub === 'setup') {
      if (!estAdmin) {
        return interaction.reply({ content: '❌ Tu dois avoir la permission "Gérer le serveur".', ephemeral: true });
      }

      // La création des salons peut prendre quelques secondes
      await interaction.deferReply({ ephemeral: true });

      // ── 1. La catégorie (créée automatiquement) ──
      let categoryId = config.categoryId;
      const categorieOption = interaction.options.getChannel('categorie');
      if (categorieOption) {
        categoryId = categorieOption.id;
      } else if (!categoryId) {
        const categorie = await guild.channels.create({
          name: '🎫 Tickets',
          type: ChannelType.GuildCategory,
        });
        categoryId = categorie.id;
      }

      // ── 2. Le salon du panneau (créé automatiquement, visible par tous) ──
      let panelChannelId = config.panelChannelId;
      const salonOption = interaction.options.getChannel('salon');
      if (salonOption) {
        panelChannelId = salonOption.id;
      } else if (!panelChannelId) {
        const salon = await guild.channels.create({
          name: 'ouvrir-un-ticket',
          type: ChannelType.GuildText,
          parent: categoryId,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel] },
          ],
        });
        panelChannelId = salon.id;
      }

      // ── 3. Le salon de logs (si fourni en option) ──
      let logChannelId = config.logChannelId;
      const logsOption = interaction.options.getChannel('salon_logs');
      if (logsOption) logChannelId = logsOption.id;

      store.setGuild(guild.id, { categoryId, panelChannelId, logChannelId });

      // ── 4. Les rôles staff ──
      const roleOption = interaction.options.getRole('role_staff');

      // Cas A : un rôle est donné en option → on termine tout de suite
      if (roleOption) {
        store.setGuild(guild.id, { staffRoleIds: [roleOption.id] });

        // Salon de logs automatique s'il n'existe pas encore
        if (!logChannelId) {
          const logs = await guild.channels.create({
            name: 'tickets-logs',
            type: ChannelType.GuildText,
            parent: categoryId,
            permissionOverwrites: [
              { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
              {
                id: roleOption.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
              },
            ],
          });
          logChannelId = logs.id;
          store.setGuild(guild.id, { logChannelId });
        }

        // Envoi du panneau
        let panelInfo = 'déjà en place';
        if (!config.panelSent) {
          const channel = await handler.envoyerPanel(guild, store.getGuild(guild.id));
          if (channel) {
            store.setGuild(guild.id, { panelSent: true });
            panelInfo = `envoyé dans ${channel}`;
          }
        }

        return interaction.editReply([
          '✅ **Système de tickets configuré !**',
          '',
          `👥 Rôle staff : <@&${roleOption.id}>`,
          `📁 Catégorie : <#${categoryId}>`,
          `📜 Salon de logs : ${logChannelId ? `<#${logChannelId}>` : '—'}`,
          `🎫 Panneau : ${panelInfo}`,
          '',
          '🧩 **Étape suivante (recommandée) :** `/setup ticket menu`',
          '→ crée tes **types de tickets** (emoji, catégorie, rôles staff par type) et personnalise le panneau.',
        ].join('\n'));
      }

      // Cas B : aucun rôle donné → menu de sélection (PLUSIEURS rôles possibles)
      return interaction.editReply({
        content: [
          '⚙️ **Configuration automatique terminée !**',
          '',
          `📁 Catégorie : <#${categoryId}>`,
          `🎫 Salon du panneau : <#${panelChannelId}>`,
          `📜 Salon de logs : ${logChannelId ? `<#${logChannelId}>` : 'sera créé à l\'étape suivante'}`,
          '',
          '👥 **Dernière étape : choisis le(s) rôle(s) du staff** dans le menu ci-dessous.',
          'Tu peux sélectionner **plusieurs rôles** en même temps.',
          '',
          '🧩 **Ensuite (recommandé) :** `/setup ticket menu` pour créer tes **types de tickets**.',
        ].join('\n'),
        components: [handler.menuRoles()],
      });
    }

    // ════════════════════════════════════════════════════
    // /ticket panel
    // ════════════════════════════════════════════════════
    if (sub === 'panel') {
      if (!estAdmin) {
        return interaction.reply({ content: '❌ Tu dois avoir la permission "Gérer le serveur".', ephemeral: true });
      }
      const salon = interaction.options.getChannel('salon');
      if (salon) store.setGuild(guild.id, { panelChannelId: salon.id });

      const cfg = store.getGuild(guild.id);
      if (!cfg.categoryId) {
        return interaction.reply({ content: '❌ Fais d\'abord `/ticket setup`.', ephemeral: true });
      }

      const titre = interaction.options.getString('titre');
      const description = interaction.options.getString('description');
      const channel = await handler.envoyerPanel(guild, cfg, { titre, description });
      if (!channel) {
        return interaction.reply({ content: '❌ Salon du panneau introuvable. Refais `/ticket setup` ou `/setup ticket bouton`.', ephemeral: true });
      }
      store.setGuild(guild.id, { panelSent: true });
      const cfg2 = store.getGuild(guild.id);
      const mode = handler.modePanneau(cfg2);
      let msg = `✅ Panneau ${mode === 'menu' ? '📋 MENU (types de tickets)' : '🔘 BOUTON (« 🎫 Ouvrir un ticket »)'} publié dans ${channel}.`;
      if (cfg2.panelMode === 'menu' && !cfg2.types.length) {
        msg += '\n⚠️ Mode menu choisi mais aucun type créé : le panneau bouton a été envoyé. Crée des types avec `/setup ticket menu`.';
      }
      return interaction.reply({ content: msg, ephemeral: true });
    }

    // ════════════════════════════════════════════════════
    // /ticket config
    // ════════════════════════════════════════════════════
    if (sub === 'config') {
      const roles = config.staffRoleIds.length > 0
        ? config.staffRoleIds.map(id => `<@&${id}>`).join(', ')
        : '❌ aucun (fais `/ticket setup`)';
      const lignesTypes = config.types.length
        ? config.types.map(t => `   ${t.emoji || '🔹'} **${t.nom}** — 📁 ${t.categoryId ? `<#${t.categoryId}>` : 'par défaut'} — 🛡️ ${(t.staffRoleIds || []).length} rôle(s)`)
        : ['   aucun — crée-les avec `/setup ticket menu`'];
      const p = config.panel || {};
      return interaction.reply({
        content: [
          '⚙️ Configuration des tickets :',
          `📁 Catégorie : ${config.categoryId ? `<#${config.categoryId}>` : '❌ non définie'}`,
          `👥 Rôles staff (${config.staffRoleIds.length}) : ${roles}`,
          `📜 Salon de logs : ${config.logChannelId ? `<#${config.logChannelId}>` : '—'}`,
          `🎫 Salon du panneau : ${config.panelChannelId ? `<#${config.panelChannelId}>` : '—'}`,
          `🎛️ Système choisi : ${config.panelMode === 'menu' ? '📋 MENU (types de tickets)' : config.panelMode === 'bouton' ? '🔘 BOUTON (« Ouvrir un ticket »)' : 'aucun pour l\'instant — `/setup ticket bouton` ou `/setup ticket menu`'}`,
          `🧩 Types de tickets (${config.types.length}) :`,
          ...lignesTypes,
          `🎨 Textes du panneau : ${p.titre || p.description || p.selecteur ? 'personnalisés' : 'par défaut'}`,
          `🎫 Tickets ouverts : ${Object.keys(config.open).length}`,
          `🔢 Dernier numéro attribué : #${config.counter}`,
        ].join('\n'),
        ephemeral: true,
      });
    }

    // ════════════════════════════════════════════════════
    // Commandes suivantes : uniquement dans un ticket ouvert
    // ════════════════════════════════════════════════════
    const t = store.getTicket(guild.id, interaction.channel.id);

    if (sub === 'claim') {
      if (!t) return interaction.reply({ content: '❌ Cette commande marche uniquement dans un ticket ouvert.', ephemeral: true });
      if (!handler.estStaff(interaction.member, config)) {
        return interaction.reply({ content: '❌ Seul le staff peut prendre en charge un ticket.', ephemeral: true });
      }
      if (t.claimedBy) {
        return interaction.reply({ content: `Ce ticket est déjà pris en charge par <@${t.claimedBy}>.`, ephemeral: true });
      }
      const maj = store.updateTicket(guild.id, interaction.channel.id, { claimedBy: interaction.user.id });
      await handler.rafraichirMessageTicket(interaction, maj);
      return interaction.reply(`🔔 <@${interaction.user.id}> a pris en charge le ticket #${maj.numero}.`);
    }

    if (sub === 'add') {
      if (!t) return interaction.reply({ content: '❌ Cette commande marche uniquement dans un ticket ouvert.', ephemeral: true });
      const membre = interaction.options.getMember('membre');
      if (!membre) return interaction.reply({ content: '❌ Membre introuvable sur le serveur.', ephemeral: true });
      await interaction.channel.permissionOverwrites.edit(membre.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
      return interaction.reply(`✅ <@${membre.id}> a été ajouté au ticket.`);
    }

    if (sub === 'remove') {
      if (!t) return interaction.reply({ content: '❌ Cette commande marche uniquement dans un ticket ouvert.', ephemeral: true });
      const membre = interaction.options.getMember('membre');
      if (!membre) return interaction.reply({ content: '❌ Membre introuvable sur le serveur.', ephemeral: true });
      await interaction.channel.permissionOverwrites.delete(membre.id).catch(() => {});
      return interaction.reply(`✅ <@${membre.id}> a été retiré du ticket.`);
    }

    if (sub === 'close') {
      if (!t) return interaction.reply({ content: '❌ Cette commande marche uniquement dans un ticket ouvert.', ephemeral: true });
      const raison = interaction.options.getString('raison');
      // Pas de raison donnée → on la demande dans un formulaire
      if (!raison) {
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
      await interaction.reply('🔒 Fermeture en cours...');
      return handler.fermerTicket(interaction, t, raison);
    }
  },
};
