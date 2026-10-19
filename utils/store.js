/**
 * store.js — petite base de données dans un fichier data.json
 * Elle garde la configuration des tickets de chaque serveur,
 * même si le bot redémarre.
 */
const fs = require('node:fs');
const path = require('node:path');

const fichier = path.join(__dirname, '..', 'data.json');

let data = { guilds: {} };

function charger() {
  try {
    if (fs.existsSync(fichier)) {
      data = JSON.parse(fs.readFileSync(fichier, 'utf8'));
      if (!data.guilds) data.guilds = {};
    }
  } catch (error) {
    console.error('Erreur de lecture de data.json, on repart de zéro :', error.message);
    data = { guilds: {} };
  }
  return data;
}

function sauvegarder() {
  fs.writeFileSync(fichier, JSON.stringify(data, null, 2));
}

// Récupère (ou crée) la configuration d'un serveur
function getGuild(guildId) {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      categoryId: null,
      staffRoleIds: [], // plusieurs rôles de staff possibles
      logChannelId: null,
      panelChannelId: null,
      panelSent: false,
      counter: 0,
      open: {},
    };
    sauvegarder();
  }
  const g = data.guilds[guildId];
  // Compatibilité avec les anciennes versions (un seul rôle staff)
  if (g.staffRoleId && g.staffRoleIds.length === 0) {
    g.staffRoleIds = [g.staffRoleId];
    sauvegarder();
  }
  return g;
}

// Modifie la configuration d'un serveur
function setGuild(guildId, modifications) {
  const actuelle = getGuild(guildId);
  data.guilds[guildId] = { ...actuelle, ...modifications };
  sauvegarder();
  return data.guilds[guildId];
}

// ─── Tickets ouverts ───
function addTicket(guildId, channelId, infos) {
  const g = getGuild(guildId);
  g.open[channelId] = infos;
  sauvegarder();
}

function removeTicket(guildId, channelId) {
  const g = getGuild(guildId);
  delete g.open[channelId];
  sauvegarder();
}

function getTicket(guildId, channelId) {
  return getGuild(guildId).open[channelId] || null;
}

function updateTicket(guildId, channelId, modifications) {
  const g = getGuild(guildId);
  if (!g.open[channelId]) return null;
  g.open[channelId] = { ...g.open[channelId], ...modifications };
  sauvegarder();
  return g.open[channelId];
}

// Cherche si un membre a déjà un ticket ouvert
function findTicketByUser(guildId, userId) {
  const open = getGuild(guildId).open;
  for (const [channelId, infos] of Object.entries(open)) {
    if (infos.userId === userId) return { channelId, ...infos };
  }
  return null;
}

// Numéro du prochain ticket (1, 2, 3...)
function prochainNumero(guildId) {
  const g = getGuild(guildId);
  g.counter += 1;
  sauvegarder();
  return g.counter;
}

module.exports = {
  charger,
  getGuild,
  setGuild,
  addTicket,
  removeTicket,
  getTicket,
  updateTicket,
  findTicketByUser,
  prochainNumero,
};
