/**
 * index.js — fichier principal du bot
 * Bot Discord spécialisé dans le système de tickets.
 */

require('dotenv').config();
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, ActivityType } = require('discord.js');
const store = require('./utils/store');
const ticket = require('./handlers/ticketHandler');

// ─── Vérification de la configuration ───
const token = (process.env.DISCORD_TOKEN || '').trim();
const clientId = (process.env.CLIENT_ID || '').trim();

if (!token || token.startsWith('colle_')) {
  console.error('❌ Le token du bot n\'est pas configuré dans le fichier .env');
  process.exit(1);
}
if (!clientId || clientId.startsWith('colle_')) {
  console.error('❌ Le CLIENT_ID n\'est pas configuré dans le fichier .env');
  process.exit(1);
}

// ─── Client Discord ───
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// ─── Chargement des données sauvegardées ───
// (Mongo en ligne si MONGODB_URI est défini, sinon fichier local data.json)

// ─── Chargement des commandes ───
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`📦 Commande chargée : /${command.data.name}`);
  }
}

// ─── Quand le bot est prêt ───
client.once(Events.ClientReady, readyClient => {
  console.log(`✅ Bot connecté : ${readyClient.user.tag}`);
  console.log(`🌍 Présent sur ${readyClient.guilds.cache.size} serveur(s).`);
  readyClient.user.setActivity('les tickets 🎫', { type: ActivityType.Watching });
});

// ─── Toutes les interactions : commandes, boutons, formulaires ───
client.on(Events.InteractionCreate, async interaction => {
  try {
    // ─── Sécurité : tout se passe sur un serveur, jamais en MP ───
    if (!interaction.guild) {
      const rep = { content: '❌ Ce système de tickets fonctionne uniquement sur un serveur, pas en MP.', ephemeral: true };
      if (interaction.replied || interaction.deferred) return interaction.followUp(rep).catch(() => {});
      return interaction.reply(rep).catch(() => {});
    }

    if (interaction.isButton()) return await ticket.handleButton(interaction);
    if (interaction.isAnySelectMenu()) return await ticket.handleSelectMenu(interaction);
    if (interaction.isModalSubmit()) return await ticket.handleModal(interaction);

    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    await command.execute(interaction);
    // ─── Sécurité : toute commande DOIT répondre (évite « l'application ne répond pas ») ───
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❓ Cette commande n\'a rien à afficher.', ephemeral: true }).catch(() => {});
    }
  } catch (error) {
    console.error('Erreur :', error);
    const reponse = { content: '❌ Une erreur est survenue.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reponse).catch(() => {});
    } else {
      await interaction.reply(reponse).catch(() => {});
    }
  }
});

// ─── Petit serveur web (utile pour l'hébergement en ligne) ───
const port = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bot Discord en ligne');
  })
  .listen(port, () => console.log(`🌐 Serveur de santé démarré sur le port ${port}`));

// ─── Sécurité : le bot ne plante pas sur une erreur isolée ───
process.on('unhandledRejection', error => {
  console.error('Erreur non gérée :', error);
});

// ─── Arrêt propre du bot ───
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log('👋 Arrêt du bot...');
    client.destroy();
    process.exit(0);
  });
}

// ─── Connexion à Discord (après chargement des données) ───
store
  .initAsync()
  .then(() => {
    console.log('🔑 Connexion à Discord en cours...');

    // Filet de sécurité : si le bot n'est pas connecté après 60 s, on redémarre
    // (l'hébergeur relancera le processus tout seul).
    const watchdog = setTimeout(() => {
      console.error('⏱️ Connexion à Discord impossible après 60 s → redémarrage automatique...');
      process.exit(1);
    }, 60000);
    client.once(Events.ClientReady, () => clearTimeout(watchdog));

    return client.login(token);
  })
  .catch(error => {
    console.error("Erreur d'initialisation :", error);
    process.exit(1);
  });
