/**
 * commands/ticket.js — la commande /ticket et toutes ses sous-commandes
 *
 * /ticket setup    → configuration 100% automatique (catégorie, salons, panneau)
 * /ticket panel    → sélecteur : envoyer le panneau MENU ou le panneau BOUTON
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
const { MessageFlags } = require('discord.js');
const store = require('../utils/store');
const handler = require('../handlers/ticketHandler');
const { repondre, maj } = require('../utils/panneaux');

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
        .setDescription('Envoyer un panneau : choix MENU ou BOUTON dans un sélecteur')
        .addChannelOption(o => o.setName('salon').setDescription('Salon où envoyer le panneau').addChannelTypes(ChannelType.GuildText))
        .addStringOption(o => o.setName('titre').setDescription('Titre du panneau'))
        .addStringOption(o => o.setName('description').setDescription('Description du panneau'))
    )
    .addSubcommand(sub => sub.setName('config').setDescription('Voir la configuration actuelle des tickets'))
    .addSubcommand(sub =>
      sub.setName('reparer').setDescription('Répare les salons et supprime les tickets fantômes (plus de « tu as déjà un ticket »)')
    )
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
        return repondre(interaction, { texte: '❌ Tu dois avoir la permission "Gérer le serveur".' });
      }

      // La création des salons peut prendre quelques secondes
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // ── 1 à 3. Catégorie, salon du panneau et salon de logs ──
      // Une SEULE logique de création (handler.preparerInfra) : elle réutilise
      // l'existant et ne crée jamais deux fois la même catégorie ou les mêmes
      // salons — c'était la cause des catégories en double.
      const categorieOption = interaction.options.getChannel('categorie');
      const salonOption = interaction.options.getChannel('salon');
      const logsOption = interaction.options.getChannel('salon_logs');
      if (categorieOption) store.setGuild(guild.id, { categoryId: categorieOption.id });
      if (salonOption) store.setGuild(guild.id, { panelChannelId: salonOption.id });
      if (logsOption) store.setGuild(guild.id, { logChannelId: logsOption.id });

      const roleOption = interaction.options.getRole('role_staff');
      if (roleOption) store.setGuild(guild.id, { staffRoleIds: [roleOption.id] });

      let infra;
      try {
        infra = await handler.preparerInfra(guild);
      } catch (erreur) {
        console.error('Erreur infrastructure :', erreur.message);
        return repondre(interaction, {
          couleur: 'erreur',
          titre: 'Impossible de préparer les salons',
          texte: 'Le bot a besoin de la permission **« Gérer les salons »** pour créer la catégorie et les salons. Donne-la lui, puis retape `/ticket setup`.',
        });
      }

      const categorie = store.getGuild(guild.id).categoryId;
      const salonPanneau = store.getGuild(guild.id).panelChannelId;
      const salonLogs = store.getGuild(guild.id).logChannelId;

      // Cas A : un rôle est donné en option → on termine tout de suite
      if (roleOption) {
        let panelInfo = 'déjà en place';
        if (!store.getGuild(guild.id).panelSent) {
          const channel = await handler.envoyerPanel(guild, store.getGuild(guild.id));
          if (channel) {
            store.setGuild(guild.id, { panelSent: true });
            panelInfo = `envoyé dans ${channel}`;
          }
        }

        return repondre(interaction, {
          couleur: 'succes',
          titre: 'Système de tickets configuré',
          lignes: [
            [
              `👥 Rôle staff : <@&${roleOption.id}>`,
              `📁 Catégorie : <#${categorie}>`,
              `📜 Salon de logs : ${salonLogs ? `<#${salonLogs}>` : '—'}`,
              `🎫 Panneau : ${panelInfo}`,
            ].join('\n'),
            infra.recrees.length
              ? `🛠️ Créé par le bot : ${infra.recrees.join(', ')}`
              : '🛠️ Aucun salon créé : tout existait déjà (aucun doublon).',
            '🧩 **Étape suivante (recommandée) :** `/setup ticket menu`\n→ crée tes **types de tickets** et personnalise le panneau.',
          ],
        });
      }

      // Cas B : aucun rôle donné → menu de sélection (PLUSIEURS rôles possibles)
      return repondre(interaction, {
        couleur: 'succes',
        titre: 'Configuration automatique terminée',
        lignes: [
          [
            `📁 Catégorie : <#${categorie}>`,
            `🎫 Salon du panneau : <#${salonPanneau}>`,
            `📜 Salon de logs : ${salonLogs ? `<#${salonLogs}>` : 'sera créé à l\'étape suivante'}`,
          ].join('\n'),
          infra.recrees.length
            ? `🛠️ Créé par le bot : ${infra.recrees.join(', ')}`
            : '🛠️ Aucun salon créé : tout existait déjà (aucun doublon).',
          '👥 **Dernière étape : choisis le(s) rôle(s) du staff** dans le menu ci-dessous.\nTu peux sélectionner **plusieurs rôles** en même temps.',
          '🧩 **Ensuite (recommandé) :** `/setup ticket menu` pour créer tes **types de tickets**.',
        ],
        composants: [handler.menuRoles()],
      });
    }

    // ════════════════════════════════════════════════════
    // /ticket panel
    // ════════════════════════════════════════════════════
    if (sub === 'panel') {
      if (!estAdmin) {
        return repondre(interaction, { texte: '❌ Tu dois avoir la permission "Gérer le serveur".' });
      }
      const salon = interaction.options.getChannel('salon');
      if (salon) store.setGuild(guild.id, { panelChannelId: salon.id });

      const cfg = store.getGuild(guild.id);
      if (!cfg.categoryId) {
        return repondre(interaction, { texte: '❌ Fais d\'abord `/ticket setup`.' });
      }

      const titre = interaction.options.getString('titre');
      const description = interaction.options.getString('description');

      // Option(s) remplie(s) → envoi direct (comportement avancé conservé)
      if (titre || description) {
        const channel = await handler.envoyerPanel(guild, cfg, { titre, description });
        if (!channel) {
          return repondre(interaction, { texte: '❌ Salon du panneau introuvable. Refais `/ticket setup` ou `/setup ticket bouton`.' });
        }
        store.setGuild(guild.id, { panelSent: true });
        const cfg2 = store.getGuild(guild.id);
        const mode = handler.modePanneau(cfg2);
        let msg = `✅ Panneau ${mode === 'menu' ? '📋 MENU (types de tickets)' : '🔘 BOUTON (« 🎫 Ouvrir un ticket »)'} publié dans ${channel}.`;
        if (cfg2.panelMode === 'menu' && !cfg2.types.length) {
          msg += '\n⚠️ Mode menu choisi mais aucun type créé : le panneau bouton a été envoyé. Crée des types avec `/setup ticket menu`.';
        }
        return repondre(interaction, { texte: msg });
      }

      // Sans option → SÉLECTEUR : on choisit le panneau, un clic = envoi
      return repondre(interaction, {
        couleur: 'info',
        titre: '🎛️ Quel panneau veux-tu envoyer ?',
        texte: 'Choisis dans le menu ci-dessous : le panneau sera publié immédiatement dans le salon configuré.',
        composants: [handler.menuChoixPanneau()],
      });
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
      return repondre(interaction, {
        couleur: 'info',
        titre: '⚙️ Configuration des tickets',
        lignes: [
          [
            `📁 Catégorie : ${config.categoryId ? `<#${config.categoryId}>` : '❌ non définie'}`,
            `👥 Rôles staff (${config.staffRoleIds.length}) : ${roles}`,
            `📜 Salon de logs : ${config.logChannelId ? `<#${config.logChannelId}>` : '—'}`,
            `🎫 Salon du panneau : ${config.panelChannelId ? `<#${config.panelChannelId}>` : '—'}`,
          ].join('\n'),
          `🎛️ Système choisi : ${config.panelMode === 'menu' ? '📋 MENU (types de tickets)' : config.panelMode === 'bouton' ? '🔘 BOUTON (« Ouvrir un ticket »)' : 'aucun pour l\'instant — `/setup ticket bouton` ou `/setup ticket menu`'}`,
          [`🧩 Types de tickets (${config.types.length}) :`, ...lignesTypes].join('\n'),
          [
            `🎨 Textes du panneau : ${p.titre || p.description || p.selecteur ? 'personnalisés' : 'par défaut'}`,
            `🎫 Tickets ouverts : ${Object.keys(config.open).length}`,
            `🔢 Dernier numéro attribué : #${config.counter}`,
          ].join('\n'),
        ],
      });
    }

    // ════════════════════════════════════════════════════
    // /ticket reparer — remet le système d'aplomb
    // ════════════════════════════════════════════════════
    if (sub === 'reparer') {
      if (!estAdmin) {
        return repondre(interaction, { couleur: 'erreur', texte: 'Tu dois avoir la permission « Gérer le serveur ».' });
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const manquantes = handler.permissionsManquantes(guild);
      let infra = { recrees: [] };
      try {
        infra = await handler.preparerInfra(guild);
      } catch (erreur) {
        console.error('Erreur réparation infrastructure :', erreur.message);
        return repondre(interaction, {
          couleur: 'erreur',
          titre: 'Réparation impossible',
          texte: 'Le bot a besoin de la permission **« Gérer les salons »**. Donne-la lui puis retape `/ticket reparer`.',
        });
      }
      const purge = await handler.purgerTicketsFantomes(guild, { verifierAcces: true });
      const cfg = store.getGuild(guild.id);
      const cache = guild.channels.cache;
      const doublons = (cache && typeof cache.filter === 'function' ? [...cache.filter(c => c.type === ChannelType.GuildCategory && /\b(log|logs)\b/i.test(c.name) && c.id !== cfg.categoryId).values()] : [])
        .map(c => `#${c.name}`);
      return repondre(interaction, {
        couleur: manquantes.length ? 'attention' : 'succes',
        titre: manquantes.length ? '⚠️ Réparé, mais permissions manquantes' : '✅ Système vérifié et réparé',
        lignes: [
          [
            `📁 Catégorie : ${cfg.categoryId ? `<#${cfg.categoryId}>` : '❌ aucune'}`,
            `🎫 Salon du panneau : ${cfg.panelChannelId ? `<#${cfg.panelChannelId}>` : '❌ aucun'}`,
            `📜 Salon de logs : ${cfg.logChannelId ? `<#${cfg.logChannelId}>` : '❌ aucun'}`,
          ].join('\n'),
          infra.recrees.length ? `🛠️ Recréé : ${infra.recrees.join(', ')}` : '🛠️ Aucun salon recréé (tout existait).',
          `🧹 Tickets fantômes supprimés : **${purge.purges}** sur ${purge.verifies} vérifié(s).`,
          manquantes.length ? `⚠️ Permissions à donner au bot : ${manquantes.join(', ')}` : null,
          doublons.length ? `🔎 Catégories « log » trouvées (vérifie si tu en as en trop) : ${doublons.join(', ')}` : null,
        ].filter(Boolean),
      });
    }

    // ════════════════════════════════════════════════════
    // Commandes suivantes : uniquement dans un ticket ouvert
    // ════════════════════════════════════════════════════
    const t = store.getTicket(guild.id, interaction.channel.id);

    if (sub === 'claim') {
      if (!t) return repondre(interaction, { texte: '❌ Cette commande marche uniquement dans un ticket ouvert.' });
      if (!handler.estStaffTicket(interaction.member, config, t)) {
        return repondre(interaction, { texte: '❌ Seul le staff peut prendre en charge un ticket.' });
      }
      if (t.claimedBy) {
        return repondre(interaction, { texte: `Ce ticket est déjà pris en charge par <@${t.claimedBy}>.` });
      }
      const maj = store.updateTicket(guild.id, interaction.channel.id, { claimedBy: interaction.user.id });
      await handler.rafraichirMessageTicket(interaction, maj);
      return repondre(interaction, { ephemere: false, texte: `🔔 <@${interaction.user.id}> a pris en charge le ticket #${maj.numero}.` });
    }

    if (sub === 'add') {
      if (!t) return repondre(interaction, { texte: '❌ Cette commande marche uniquement dans un ticket ouvert.' });
      if (!handler.estStaffTicket(interaction.member, config, t)) {
        return repondre(interaction, { couleur: 'erreur', texte: '❌ Seul le staff de ce ticket peut ajouter un membre.' });
      }
      const membre = interaction.options.getMember('membre');
      if (!membre) return repondre(interaction, { texte: '❌ Membre introuvable sur le serveur.' });
      try {
        await interaction.channel.permissionOverwrites.edit(membre.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
      } catch {
        return repondre(interaction, { texte: '❌ Impossible de modifier les permissions de ce salon. Vérifie que mon rôle est tout en haut de la liste des rôles.' });
      }
      return repondre(interaction, { ephemere: false, texte: `✅ <@${membre.id}> a été ajouté au ticket.` });
    }

    if (sub === 'remove') {
      if (!t) return repondre(interaction, { texte: '❌ Cette commande marche uniquement dans un ticket ouvert.' });
      const membre = interaction.options.getMember('membre');
      if (!membre) return repondre(interaction, { texte: '❌ Membre introuvable sur le serveur.' });
      await interaction.channel.permissionOverwrites.delete(membre.id).catch(() => {});
      return repondre(interaction, { ephemere: false, texte: `✅ <@${membre.id}> a été retiré du ticket.` });
    }

    if (sub === 'close') {
      if (!t) return repondre(interaction, { texte: '❌ Cette commande marche uniquement dans un ticket ouvert.' });
      // Sécurité : seul le staff du ticket peut fermer
      if (!handler.estStaffTicket(interaction.member, config, t)) {
        return repondre(interaction, {
          couleur: 'erreur',
          titre: '🔒 Fermeture réservée au staff',
          texte: 'Seul un membre du staff de ce ticket peut le fermer.',
        });
      }
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
      await repondre(interaction, { ephemere: false, couleur: 'attention', texte: '🔒 Fermeture en cours...' });
      return handler.fermerTicket(interaction, t, raison);
    }
  },
};
