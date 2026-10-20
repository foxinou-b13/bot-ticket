/**
 * index.js — fichier principal du bot
 * Bot Discord spécialisé dans le système de tickets.
 */

require('dotenv').config();
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, ActivityType } = require('discord.js');
const { MessageFlags } = require('discord.js');
const store = require('./utils/store');
const { genererBanniere } = require('./utils/banniere');
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
      const rep = { content: '❌ Ce système de tickets fonctionne uniquement sur un serveur, pas en MP.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) return interaction.followUp(rep).catch(() => {});
      return interaction.reply(rep).catch(() => {});
    }

    if (interaction.isButton()) await ticket.handleButton(interaction);
    else if (interaction.isAnySelectMenu()) await ticket.handleSelectMenu(interaction);
    else if (interaction.isModalSubmit()) await ticket.handleModal(interaction);
    else if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
    } else {
      return;
    }
    // ─── Sécurité : TOUTE interaction DOIT recevoir une réponse ───
    // (commande, bouton, menu ou formulaire : évite « l'application ne répond pas »)
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❓ Cette commande n\'a rien à afficher.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  } catch (error) {
    console.error('Erreur :', error);
    const code = error && error.code;
    let texte = '❌ Une erreur est survenue.';
    if (code === 50001 || code === 50013) {
      texte = '❌ Il me manque des permissions pour faire ça. Place mon rôle tout en haut de la liste des rôles du serveur (Paramètres du serveur → Rôles), puis réessaie.';
    }
    const reponse = { content: texte, flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reponse).catch(() => {});
    } else {
      await interaction.reply(reponse).catch(() => {});
    }
  }
});

// ─── Mini site web : page d'invitation (comme DraftBot) + santé ───
const port = process.env.PORT || 3000;
const LIEN_INVITATION =
  'https://discord.com/oauth2/authorize?client_id=' +
  (process.env.CLIENT_ID || '1528495720158593074') +
  '&scope=bot+applications.commands&permissions=8';
const banniereSite = genererBanniere('SUPPORT FRENCH VOICE');

const PAGE_ACCUEIL = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ONE Assist — Bot Tickets pour Discord</title>
</head>
<body style="margin:0;background:#0d1426;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#f2f4f6;">
<div style="max-width:640px;margin:0 auto;padding:28px 18px 40px;">
  <img src="/banniere.png" alt="ONE Assist" style="width:100%;border-radius:10px;border:1px solid #7a2430;display:block;">
  <h1 style="font-size:26px;margin:22px 0 6px;">ONE Assist</h1>
  <p style="color:#9aa7b8;margin:0 0 20px;font-size:15px;">Le bot de tickets professionnel, entièrement en français, pour votre serveur Discord.</p>
  <ul style="color:#c6cfda;font-size:15px;line-height:1.9;margin:0 0 26px;padding-left:22px;">
    <li>🎫 Tickets privés avec raison obligatoire à l'ouverture et à la fermeture</li>
    <li>📋 Panneau avec menu déroulant par type de demande</li>
    <li>📜 Transcription complète + rapport dans un salon de logs</li>
    <li>️ Installation automatique en 2 minutes avec /setup</li>
    <li>🔒 Hébergé 24h/24, 7j/7 — gratuit, sans carte bancaire</li>
  </ul>
  <a href="${LIEN_INVITATION}" style="display:block;background:#b2303d;color:#fff;text-align:center;text-decoration:none;font-weight:700;font-size:17px;padding:16px 10px;border-radius:10px;">🎫 Ajouter à Discord</a>
  <p style="color:#7d8899;font-size:13px;text-align:center;margin:14px 0 0;">Discord s'ouvre : choisissez votre serveur → Continuer → Autoriser. C'est tout.</p>
  <p style="color:#5f6b7c;font-size:12px;text-align:center;margin:30px 0 0;">🟢 Statut : en ligne • Système de tickets v2</p>
</div>
</body>
</html>`;

http
  .createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Bot Discord en ligne');
    }
    if (url === '/banniere.png') {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' });
      return res.end(banniereSite);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(PAGE_ACCUEIL);
  })
  .listen(port, () => console.log(`🌐 Serveur web démarré sur le port ${port} (page d'invitation + santé)`));

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

// ─── Diagnostic réseau au démarrage (pour voir dans les logs de l'hébergeur) ───
const https = require('https');
const net = require('net');

function diagReseau() {
  const t0 = Date.now();

  const req = https.get('https://discord.com/api/v10/gateway', r => {
    let b = '';
    r.on('data', c => (b += c));
    r.on('end', () => console.log(`🩺 REST discord.com → ${r.statusCode} ${b.slice(0, 70)} (${Date.now() - t0} ms)`));
  });
  req.on('error', e => console.log('🩺 REST discord.com → ERREUR :', e.message));
  req.setTimeout(15000, () => { console.log('🩺 REST discord.com → TIMEOUT 15 s'); req.destroy(); });

  const s = net.connect({ host: 'gateway.discord.gg', port: 443 });
  s.on('connect', () => { console.log(`🩺 TCP gateway.discord.gg:443 → OK (${Date.now() - t0} ms)`); s.destroy(); });
  s.on('error', e => console.log('🩺 TCP gateway.discord.gg:443 → ERREUR :', e.message));
  s.setTimeout(15000, () => { console.log('🩺 TCP gateway.discord.gg:443 → TIMEOUT 15 s'); s.destroy(); });
}

// ─── Connexion à Discord (après chargement des données) ───
store
  .initAsync()
  .then(() => {
    console.log('🔑 Connexion à Discord en cours...');
    diagReseau();

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
