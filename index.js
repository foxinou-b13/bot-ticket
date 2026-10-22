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

// ─── Version du bot (vérifiable sur /health) ───
const VERSION = 'v2026-10-22-anti-veille-2';
const { repondre } = require('./utils/panneaux');

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
client.once(Events.ClientReady, async readyClient => {
  console.log(`✅ Bot connecté : ${readyClient.user.tag}`);
  console.log(`🌍 Présent sur ${readyClient.guilds.cache.size} serveur(s).`);
  // ─── Statut du bot : UNIQUEMENT l'activité « Regarde » ───
  // (un bot ne peut afficher qu'une seule activité ; le statut personnalisé
  //  « bulle » a été retiré volontairement — c'est le « Regarde » qui est gardé)
  const TEXTE_ACTIVITE = 'vos tickets · réponse 24h/24 🎫';
  const appliquerStatut = () => {
    try {
      readyClient.user.setPresence({
        status: 'online',
        activities: [{ name: TEXTE_ACTIVITE, type: ActivityType.Watching }],
      });
      console.log(`Statut : Regarde ${TEXTE_ACTIVITE}`);
    } catch (erreur) {
      readyClient.user.setActivity(TEXTE_ACTIVITE, { type: ActivityType.Watching });
      console.error('Statut reapplique autrement :', erreur.message);
    }
  };
  appliquerStatut();
  // Discord peut perdre la presence apres une reconnexion : on la reapplique
  setInterval(appliquerStatut, 10 * 60 * 1000);

  // ─── Vérification automatique au démarrage ───
  // Uniquement sur les serveurs où les tickets sont DÉJÀ configurés : le bot
  // ne crée jamais de catégorie ou de salon sur un serveur où on ne lui a
  // rien demandé (c'était la cause des catégories « en trop »).
  for (const guild of readyClient.guilds.cache.values()) {
    try {
      const cfg = store.getGuild(guild.id);
      const configure = Boolean(
        cfg.categoryId || cfg.logChannelId || cfg.panelChannelId || cfg.panelSent || (cfg.types || []).length
      );
      if (!configure) continue;
      const infra = await ticket.preparerInfra(guild);
      const purge = await ticket.purgerTicketsFantomes(guild, { verifierAcces: true });
      // Les cartes des tickets déjà ouverts prennent la nouvelle disposition
      const cartes = await ticket.rafraichirCartesTickets(guild);
      console.log(
        `🛠️ ${guild.name} : ${infra.recrees.length ? 'réparé (' + infra.recrees.join(', ') + ')' : 'infrastructure OK'}` +
        ` · ${purge.purges} ticket(s) fantôme(s) supprimé(s)` +
        ` · ${cartes.misAJour} carte(s) de ticket mise(s) à jour`
      );
    } catch (erreur) {
      console.error(`⚠️ Vérification de ${guild.name} impossible :`, erreur.message);
    }
  }

  // ─── Nettoyage périodique (toutes les 30 minutes) ───
  setInterval(async () => {
    for (const guild of readyClient.guilds.cache.values()) {
      try {
        const cfg = store.getGuild(guild.id);
        if (!cfg.panelSent && !(cfg.types || []).length) continue;
        await ticket.purgerTicketsFantomes(guild, { verifierAcces: true });
      } catch { /* on réessaiera au prochain passage */ }
    }
  }, 30 * 60 * 1000);
});

// ─── Salon / catégorie supprimé → réparation automatique ───
// (exemple vécu : le salon de logs supprimé laissait une configuration morte)
client.on(Events.ChannelDelete, async channel => {
  try {
    const guild = channel.guild;
    if (!guild) return;
    const cfg = store.getGuild(guild.id);
    const concerne = [cfg.logChannelId, cfg.panelChannelId, cfg.categoryId].filter(Boolean).includes(channel.id);
    if (!concerne) return;
    const infra = await ticket.preparerInfra(guild);
    console.log(`🛠️ Salon supprimé détecté sur ${guild.name} → ${infra.recrees.join(', ') || 'vérifié'}`);
  } catch (erreur) {
    console.error('Réparation après suppression impossible :', erreur.message);
  }
});

// ─── Toutes les interactions : commandes, boutons, formulaires ───
client.on(Events.InteractionCreate, async interaction => {
  try {
    // ─── Sécurité : tout se passe sur un serveur, jamais en MP ───
    if (!interaction.guild) {
      return repondre(interaction, {
        couleur: 'erreur',
        texte: 'Ce système de tickets fonctionne uniquement sur un serveur, pas en MP.',
      });
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
      await repondre(interaction, { couleur: 'attention', texte: 'Cette commande n\'a rien à afficher.' });
    }
  } catch (error) {
    console.error('Erreur :', error);
    const code = error && error.code;
    let texte = '❌ Une erreur est survenue.';
    if (code === 50001 || code === 50013) {
      texte = '❌ Il me manque des permissions pour faire ça. Place mon rôle tout en haut de la liste des rôles du serveur (Paramètres du serveur → Rôles), puis réessaie.';
    }
    await repondre(interaction, { couleur: 'erreur', titre: 'Une erreur est survenue', texte });
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
<title>One Assist — Bot Tickets pour Discord</title>
</head>
<body style="margin:0;background:#0d1426;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#f2f4f6;">
<div style="max-width:640px;margin:0 auto;padding:28px 18px 40px;">
  <img src="/banniere.png" alt="One Assist" style="width:100%;border-radius:10px;border:1px solid #7a2430;display:block;">
  <h1 style="font-size:26px;margin:22px 0 6px;">One Assist</h1>
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
      // Diagnostic complet : la version, l'état RÉEL de la connexion à Discord,
      // le ping, le nombre de serveurs et l'ancienneté du processus.
      const connecte = client.isReady() ? 'oui' : 'NON';
      const ping = client.ws && client.ws.ping >= 0 ? `${client.ws.ping} ms` : 'n/a';
      const serveurs = client.isReady() ? client.guilds.cache.size : 0;
      const depuis = Math.round(process.uptime() / 60);
      return res.end(
        `Bot Discord en ligne · ${VERSION}` +
          `\ngateway=${connecte} · ping=${ping} · serveurs=${serveurs}` +
          `\nuptime=${depuis} min · statut=${client.user ? client.presence?.status || 'online' : 'non connecté'}` +
          `\nauto-appel=${DERNIER_AUTO_APPEL}`
      );
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

// ─── Maintien en éveil (Render gratuit endort le service après 15 min sans
// visite, ce qui déconnecte le bot). On s'appelle soi-même via l'URL publique
// toutes les 10 minutes : le service reste réveillé 24h/24, même si le
// surveillant externe (UptimeRobot) est en pause.
let DERNIER_AUTO_APPEL = 'jamais';

function maintenirEveille() {
  const base = (process.env.RENDER_EXTERNAL_URL || 'https://bot-ticket-wq1h.onrender.com')
    .trim()
    .replace(/\/$/, '');
  const appeler = () => {
    const req = https.get(`${base}/health`, r => {
      r.resume();
      DERNIER_AUTO_APPEL = `${r.statusCode} à ${new Date().toLocaleTimeString('fr-FR')}`;
      console.log(`⏰ Maintien en éveil : ${r.statusCode} (${new Date().toLocaleTimeString('fr-FR')})`);
    });
    req.on('error', e => console.log('⏰ Maintien en éveil : erreur', e.message));
    req.setTimeout(20000, () => req.destroy());
  };
  setTimeout(appeler, 30000);
  setInterval(appeler, 10 * 60 * 1000);
  console.log(`ℹ️ Maintien en éveil actif sur ${base} (toutes les 10 min)`);
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
    maintenirEveille();

    // Filet de sécurité : si le bot n'est pas connecté après 60 s, on redémarre
    // (l'hébergeur relancera le processus tout seul).
    const watchdog = setTimeout(() => {
      console.error('⏱️ Connexion à Discord impossible après 60 s → redémarrage automatique...');
      process.exit(1);
    }, 60000);
    client.once(Events.ClientReady, () => clearTimeout(watchdog));

// ─── Surveillance : si la connexion Discord est perdue (déconnexion non
// récupérée), on redémarre le processus : l'hébergeur relance automatiquement.
let dernierReady = Date.now();
client.on(Events.ShardDisconnect, () => {
  console.error('⚠️ Connexion Discord perdue, tentative de reconnexion...');
});
client.on(Events.ShardResume, () => {
  dernierReady = Date.now();
  console.log('🔁 Connexion Discord rétablie');
});
client.on(Events.Error, e => console.error('❌ Erreur du client Discord :', e.message));
setInterval(() => {
  if (client.isReady()) {
    dernierReady = Date.now();
    return;
  }
  if (Date.now() - dernierReady > 180000) {
    console.error('⏱️ Bot déconnecté depuis plus de 3 min → redémarrage automatique...');
    process.exit(1);
  }
}, 60000);

    return client.login(token);
  })
  .catch(error => {
    console.error("Erreur d'initialisation :", error);
    process.exit(1);
  });
