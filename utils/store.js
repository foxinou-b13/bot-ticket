/**
 * store.js — base de données du bot
 * - Sauvegarde LOCALE dans data.json (toujours, en secours)
 * - Sauvegarde EN LIGNE MongoDB si MONGODB_URI est défini (recommandé sur
 *   Render, car le disque y est effacé à chaque redéploiement)
 */
const fs = require('node:fs');
const path = require('node:path');

let MongoClient = null;
try {
  MongoClient = require('mongodb').MongoClient;
} catch {
  // Dépendance optionnelle : le bot fonctionne sans (sauvegarde locale)
}

const fichier = path.join(__dirname, '..', 'data.json');

let data = { guilds: {} };
let collection = null;
let mongoOk = false;
let saveTimer = null;

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

// Initialisation : Mongo en ligne si possible, sinon fichier local
async function initAsync() {
  const uri = (process.env.MONGODB_URI || '').trim();
  if (uri && MongoClient) {
    try {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
      await client.connect();
      const db = client.db('bot-tickets');
      collection = db.collection('config');
      const doc = await collection.findOne({ _id: 'guilds' });
      if (doc && doc.guilds) data = { guilds: doc.guilds };
      mongoOk = true;
      console.log('💾 Base Mongo connectée : la configuration survivra aux redéploiements.');
      return data;
    } catch (error) {
      console.error('⚠️ Mongo injoignable, sauvegarde locale uniquement :', error.message);
    }
  }
  return charger();
}

function sauvegarder() {
  // Locale : toujours (secours)
  try {
    fs.writeFileSync(fichier, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erreur écriture data.json :', error.message);
  }
  // En ligne : debouncée (1,5 s) pour ne pas spammer la base
  if (mongoOk && collection) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      collection
        .replaceOne({ _id: 'guilds' }, { _id: 'guilds', guilds: data.guilds }, { upsert: true })
        .catch(error => console.error('Erreur sauvegarde Mongo :', error.message));
    }, 1500);
  }
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
      panelMessageId: null,
      counter: 0,
      open: {},
      panelMode: null, // 'bouton' ou 'menu' : le choix du serveur
      panel: { titre: null, description: null, selecteur: null, image: null }, // textes du panneau
      types: [], // types de tickets : { id, nom, emoji, description, categoryId, staffRoleIds[] }
    };
    sauvegarder();
  }
  const g = data.guilds[guildId];
  // Compatibilité avec les anciennes versions (un seul rôle staff)
  if (g.staffRoleId && (!g.staffRoleIds || g.staffRoleIds.length === 0)) {
    g.staffRoleIds = [g.staffRoleId];
    sauvegarder();
  }
  // Compatibilité : champs ajoutés par les versions successives
  if (!g.staffRoleIds) g.staffRoleIds = [];
  if (!g.open) g.open = {};
  if (!g.panel) g.panel = { titre: null, description: null, selecteur: null, image: null };
  if (g.panel.image === undefined) g.panel.image = null;
  if (!Array.isArray(g.types)) g.types = [];
  if (g.panelMode !== 'bouton' && g.panelMode !== 'menu') g.panelMode = null;
  return g;
}

// Modifie la configuration d'un serveur
function setGuild(guildId, modifications) {
  const actuelle = getGuild(guildId);
  data.guilds[guildId] = { ...actuelle, ...modifications };
  sauvegarder();
  return data.guilds[guildId];
}

// ─── Types de tickets ───
function getType(guildId, typeId) {
  return getGuild(guildId).types.find(t => t.id === typeId) || null;
}

function addType(guildId, type) {
  const g = getGuild(guildId);
  g.types.push(type);
  sauvegarder();
  return type;
}

function updateType(guildId, typeId, modifications) {
  const g = getGuild(guildId);
  const type = g.types.find(t => t.id === typeId);
  if (!type) return null;
  Object.assign(type, modifications);
  sauvegarder();
  return type;
}

function removeType(guildId, typeId) {
  const g = getGuild(guildId);
  g.types = g.types.filter(t => t.id !== typeId);
  sauvegarder();
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
  initAsync,
  getGuild,
  setGuild,
  getType,
  addType,
  updateType,
  removeType,
  addTicket,
  removeTicket,
  getTicket,
  updateTicket,
  findTicketByUser,
  prochainNumero,
};
