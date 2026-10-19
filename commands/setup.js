/**
 * commands/setup.js — la commande /setup et ses sous-commandes
 *
 * /setup ticket menu → assistant des types de tickets :
 *   crée/modifie les types (nom, emoji, description, catégorie, rôles staff),
 *   personnalise les textes du panneau, puis publie le panneau.
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
            .setName('menu')
            .setDescription('Assistant : types de tickets, textes du panneau, catégories, rôles staff')
        )
    ),

  async execute(interaction) {
    const groupe = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    if (groupe === 'ticket' && sub === 'menu') {
      return handler.menuPrincipal(interaction);
    }
  },
};
