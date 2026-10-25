/**
 * commands/setup.js — la commande /setup et ses sous-commandes
 *
 * /setup ticket bouton → système BOUTON : assistant autonome
 *                        (salon du panneau, catégorie, logs, rôles, titre,
 *                         description, texte et emoji du bouton)
 * /setup ticket menu   → système MENU : assistant des types de tickets
 *                        (nom, emoji, description, catégorie, rôles staff par type)
 *
 * Chaque serveur CHOISIT son système : les deux existent et sont indépendants.
 */
const { SlashCommandBuilder } = require('discord.js');
const handler = require('../handlers/ticketHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configuration du serveur')
    .addSubcommandGroup(groupe =>
      groupe
        .setName('ticket')
        .setDescription('Configuration des tickets')
        .addSubcommand(sub =>
          sub
            .setName('bouton')
            .setDescription('Système BOUTON : assistant de configuration (salons, rôles, textes, bouton)')
        )
        .addSubcommand(sub =>
          sub
            .setName('menu')
            .setDescription('Système MENU : types de tickets personnalisés (assistant guidé)')
        )
    ),

  async execute(interaction) {
    const groupe = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    if (groupe === 'ticket' && sub === 'bouton') {
      return handler.configBouton(interaction);
    }
    if (groupe === 'ticket' && sub === 'menu') {
      return handler.menuPrincipal(interaction);
    }
  },
};
