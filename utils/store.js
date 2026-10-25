/**
 * store.js — base de données du bot
 * Ordre de sauvegarde (du meilleur au secours) :
 *  1. GitHub (branche DATA_BRANCH, ex: data) si DATA_TOKEN est défini
 *     → survit aux redéploiements Render, sans compte supplémentaire
 *  2. MongoDB si MONGODB_URI est défini
 *  3. Fichier local data.json (toujours, en secours)
 */
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

let MongoClient = null;
try {
  MongoClient = require('mongodb').MongoClient;
} catch {
  // Dépendance optionnelle
}

const fichier = path.join(__dirname, '..', 'data.json');

let data = { guilds: {} };
let collection = null;
let mongoOk = false;
let gitOk = false;
let saveTimer = null;

// ─── Réglages sauvegarde GitHub ───
const DATA_REPO = (process.env.DATA_REPO || '').trim();
const DATA_BRANCH = (process.env.DATA_BRANCH || 'data').trim();
const DATA_TOKEN = (process.env.DATA_TOKEN || '').trim();

function gitApi(method, chemin, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      Authorization: `Bearer ${DATA_TOKEN}`,
      'User-Agent': 'bot-tickets',
      Accept: 'application/vnd.github+json',
    };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = https.request({ hostname: 'api.github.com', path: chemin, method, headers }, res => {
      let brut = '';
      res.on('data', c => { brut += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: brut }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function gitEnsureBranch() {
  const ref = await gitApi('GET', `/repos/${DATA_REPO}/git/ref/heads/${DATA_BRANCH}`);
  if (ref.status === 200) return;
  const main = await gitApi('GET', `/repos/${DATA_REPO}/git/ref/heads/main`);
  if (main.status !== 200) return;
  const sha = JSON.parse(main.body).object.sha;
  await gitApi('POST', `/repos/${DATA_REPO}/git/refs`, { ref: `refs/heads/${DATA_BRANCH}`, sha });
}

async function gitCharger() {
  const r = await gitApi('GET', `/repos/${DATA_REPO}/contents/data.json?ref=${DATA_BRANCH}`);
  if (r.status === 200) {
    const j = JSON.parse(r.body);
    const contenu = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
    if (contenu && contenu.guilds) data = contenu;
  } else if (r.status === 404) {
    await gitEnsureBranch();
  }
}

function gitSauvegarder() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const contenu = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
      const actuel = await gitApi('GET', `/repos/${DATA_REPO}/contents/data.json?ref=${DATA_BRANCH}`);
      const body = {
        message: 'sauvegarde config bot',
        content: contenu,
        branch: DATA_BRANCH,
      };
      if (actuel.status === 200) body.sha = JSON.parse(actuel.body).sha;
      const r = await gitApi('PUT', `/repos/${DATA_REPO}/contents/data.json`, body);
      if (r.status !== 200 && r.status !== 201) {
        console.error('Erreur sauvegarde GitHub :', r.status, r.body.slice(0, 200));
      }
    } catch (error) {
      console.error('Erreur sauvegarde GitHub :', error.message);
    }
  }, 2000);
}

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

// Initialisation : GitHub en ligne > Mongo > fichier local
async function initAsync() {
  if (DATA_TOKEN && DATA_REPO) {
    try {
      await gitCharger();
      gitOk = true;
      console.log(`💾 Sauvegarde GitHub activée (branche ${DATA_BRANCH}) : la config survivra aux redéploiements.`);
      return data;
    } catch (error) {
      console.error('⚠️ GitHub injoignable :', error.message);
    }
  }
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
  if (gitOk) return gitSauvegarder();
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
      // ─── Système BOUTON : réglages AUTONOMES (indépendants du menu) ───
      bouton: {
        configure: false, // true quand l'assistant a été terminé
        categoryId: null, // catégorie où vivent les salons de ticket
        panelChannelId: null, // salon où le panneau bouton est publié
        logChannelId: null, // salon des transcriptions
        staffRoleIds: [], // rôles qui voient/traitent les tickets
        panelMessageId: null, // le message du panneau (pour le mettre à jour, pas l'empiler)
        panel: { titre: null, description: null, image: null, bouton: null }, // textes du panneau bouton
      },
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
  // Compatibilité : le bloc « bouton » a été ajouté après coup
  if (!g.bouton || typeof g.bouton !== 'object') g.bouton = {};
  const b = g.bouton;
  if (b.configure === undefined) b.configure = false;
  if (b.categoryId === undefined) b.categoryId = null;
  if (b.panelChannelId === undefined) b.panelChannelId = null;
  if (b.logChannelId === undefined) b.logChannelId = null;
  if (!Array.isArray(b.staffRoleIds)) b.staffRoleIds = [];
  if (b.panelMessageId === undefined) b.panelMessageId = null;
  if (!b.panel || typeof b.panel !== 'object') b.panel = {};
  if (b.panel.titre === undefined) b.panel.titre = null;
  if (b.panel.description === undefined) b.panel.description = null;
  if (b.panel.image === undefined) b.panel.image = null;
  if (b.panel.bouton === undefined) b.panel.bouton = null;
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
