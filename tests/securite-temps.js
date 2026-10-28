/**
 * tests/securite-temps.js — « L'application n'a pas répondu à temps »
 *
 * Discord donne 3 secondes. On simule un Discord LENT (chaque appel dure 1,2 s,
 * comme sur Render gratuit) et on vérifie que le bot accuse toujours réception
 * dans les temps, puis répond normalement.
 */
const assert = require('node:assert');
const store = require('../utils/store');
const h = require('../handlers/ticketHandler');
const { differer, filetDeSecurite } = require('../utils/panneaux');

let ok = 0, ko = 0;
async function test(nom, fn) {
  try { await fn(); ok++; console.log('  ✅', nom); }
  catch (e) { ko++; console.log('  ❌', nom, '→', e.message); }
}

const G = 'g-secu-' + Date.now();
const LIMITE = 3000;           // la vraie limite Discord
const LENT = 1700;             // latence simulée de chaque appel Discord
const attendre = ms => new Promise(r => setTimeout(r, ms));

const admin = { permissions: { has: () => true }, roles: { cache: new Map() } };

/** Interaction qui mesure le délai entre le clic et l'accusé de réception. */
function interLente(customId, extra = {}) {
  const it = {
    customId, member: admin, values: [], fields: { getTextInputValue: () => 'raison' },
    client: { user: { id: 'bot' } },
    t0: Date.now(), ackAt: null, reponses: [], defers: 0,
    get deferred() { return this._d; }, get replied() { return this._r; },
    _d: false, _r: false,
    isRepliable: () => true,
    deferReply: async () => { it.defers++; it.ackAt = Date.now() - it.t0; it._d = true; return {}; },
    reply: async p => { it.ackAt = it.ackAt || Date.now() - it.t0; it._r = true; it.reponses.push(p); return {}; },
    editReply: async p => { it.reponses.push(p); return {}; },
    update: async p => { it.ackAt = it.ackAt || Date.now() - it.t0; it._r = true; it.reponses.push(p); return {}; },
    followUp: async p => { it.reponses.push(p); return {}; },
    showModal: async () => { it.ackAt = it.ackAt || Date.now() - it.t0; it._r = true; return {}; },
    ...extra,
  };
  return it;
}

/** Serveur dont chaque opération Discord traîne (comme sur Render gratuit). */
function guildLente() {
  const cree = [];
  const ralentir = async v => { await attendre(LENT); return v; };
  const salon = {
    id: 'TICKET-1', name: 'ticket-0001',
    permissionOverwrites: { edit: async () => ralentir(true) },
    send: async () => ralentir({ id: 'msg', pin: async () => ralentir(true), edit: async () => ({}) }),
  };
  return {
    id: G, name: 'Serveur Lent',
    roles: { everyone: { id: 'everyone' }, cache: new Map() },
    members: { me: { id: 'bot' }, fetch: async () => ralentir({ id: 'membre-slow' }) },
    client: { user: { id: 'bot' } },
    channels: {
      fetch: async () => ralentir(salon),
      create: async o => { cree.push(o); return ralentir(salon); },
      cache: new Map(),
    },
    _cree: cree,
  };
}

(async () => {
  console.log('── Sécurité : plus jamais « n\'a pas répondu à temps » ──');

  await test('differer() accuse réception immédiatement (une seule fois)', async () => {
    const it = interLente('x');
    assert.equal(await differer(it), true);
    assert.equal(it.defers, 1);
    assert.ok(it.ackAt < 50, 'l\'accusé de réception doit être immédiat');
    assert.equal(await differer(it), false, 'ne doit pas accuser deux fois');
    assert.equal(it.defers, 1);
  });

  await test('differer() ne plante jamais si l\'interaction est expirée', async () => {
    const it = interLente('x', { deferReply: async () => { throw new Error('Unknown interaction'); } });
    assert.equal(await differer(it), false);
  });

  await test('filet de sécurité : répond tout seul si le traitement traîne', async () => {
    const it = interLente('x');
    const stop = poserFiletRapide(it);
    await attendre(120);
    assert.equal(it.defers, 1, 'le filet n\'a pas accusé réception');
    assert.ok(it.ackAt < LIMITE);
    stop();
  });

  function poserFiletRapide(it) { return filetDeSecurite(it, 60); }

  await test('filet de sécurité : ne double pas une réponse déjà envoyée', async () => {
    const it = interLente('x');
    it._r = true; // déjà répondu
    const stop = poserFiletRapide(it);
    await attendre(120);
    assert.equal(it.defers, 0, 'le filet a répondu alors que le bot avait déjà répondu');
    stop();
  });

  await test('filet de sécurité : arrêté à temps, il ne fait rien', async () => {
    const it = interLente('x');
    const stop = poserFiletRapide(it);
    stop();
    await attendre(120);
    assert.equal(it.defers, 0);
  });

  await test('création de ticket sur un Discord LENT : accusé AVANT les appels', async () => {
    store.setGuild(G, {
      bouton: {
        configure: true, panelChannelId: 'P', logChannelId: 'L', categoryId: null,
        staffRoleIds: [], panel: {},
        items: [{ id: 'i1', label: 'Support', emoji: '🎫', couleur: 'vert', categoryId: 'CAT', staffRoleIds: ['R1'] }],
      },
    });
    const g = guildLente();
    const membre = {
      id: 'membre-slow', user: { id: 'membre-slow', username: 'U', bot: false, displayAvatarURL: () => 'x' },
      guild: g, displayName: 'U', permissions: { has: () => false }, roles: { cache: new Map() },
    };
    const it = interLente('ticket:item:i1', { guild: g, member: membre, user: membre.user });
    const debut = Date.now();
    await h.handleModal(it);
    const total = Date.now() - debut;

    assert.ok(total > LIMITE, 'le scénario doit bien dépasser 3 s (sinon le test ne prouve rien) — ' + total + ' ms');
    assert.ok(it.defers >= 1, 'aucun accusé de réception : le membre aurait vu « n\'a pas répondu à temps »');
    assert.ok(it.ackAt < LIMITE, 'accusé trop tardif : ' + it.ackAt + ' ms');
    assert.ok(g._cree.length === 1, 'le ticket n\'a pas été créé');
    assert.equal(g._cree[0].parent, 'CAT');
    assert.ok(it.reponses.length >= 1, 'aucune réponse finale au membre');
    const finale = JSON.stringify(it.reponses[it.reponses.length - 1]);
    assert.match(finale, /ticket est ouvert/, 'le membre n\'a pas eu sa confirmation');
  });

  await test('aucune réponse n\'est perdue quand la création échoue', async () => {
    const g = guildLente();
    g.channels.create = async () => { await attendre(LENT); throw new Error('Missing Permissions'); };
    let rep = null;
    const it = interLente('ticket:item:i1', {
      guild: g, user: admin,
      member: { ...admin, guild: g },
      editReply: async p => { rep = p; },
      followUp: async p => { rep = p; },
    });
    await h.handleModal(it);
    assert.ok(rep, 'aucune réponse après un échec de création');
    assert.match(JSON.stringify(rep), /permission|Gérer les salons/i);
  });

  await test('même ticket ouvert deux fois très vite → un seul salon', async () => {
    store.setGuild(G, {
      bouton: {
        configure: true, panelChannelId: 'P', logChannelId: 'L', panel: {},
        items: [{ id: 'i1', label: 'Support', emoji: '🎫', couleur: 'vert', categoryId: 'CAT', staffRoleIds: ['R1'] }],
      },
    });
    const g = guildLente();
    const user = { id: 'double-' + Date.now(), username: 'D', bot: false, displayAvatarURL: () => 'x' };
    const membre = { id: user.id, user, guild: g, displayName: 'D', permissions: { has: () => false }, roles: { cache: new Map() } };
    const a = interLente('ticket:item:i1', { guild: g, member: membre, user });
    const b = interLente('ticket:item:i1', { guild: g, member: membre, user });
    await Promise.all([h.handleModal(a), h.handleModal(b)]);
    assert.equal(g._cree.length, 1, 'deux salons créés pour un seul clic double !');
  });

  await test('publication du panneau : accusé AVANT l\'envoi, sur un Discord lent', async () => {
    store.setGuild(G, {
      bouton: {
        configure: false, categoryId: null, panelChannelId: 'P', logChannelId: 'L', staffRoleIds: [], panelMessageId: null,
        panel: {}, items: [{ id: 'a', label: 'Support', emoji: '🎫', couleur: 'vert', categoryId: 'CAT', staffRoleIds: ['R1'] }],
      },
    });
    const evenements = [];
    const g = guildLente();
    const salon = {
      id: 'P', type: 0,
      permissionOverwrites: { edit: async () => attendre(LENT) },
      messages: { fetch: async () => { await attendre(LENT); return null; } },
      send: async () => { evenements.push('envoi'); await attendre(LENT); return { id: 'm-pub' }; },
    };
    g.channels.fetch = async () => salon;
    const it = interLente('tktb:publier', { guild: g });
    it.deferUpdate = async () => { it.ackAt = Date.now() - it.t0; it._d = true; it.defers++; evenements.push('accuse'); };
    const debut = Date.now();
    await h.handleButton(it);
    const total = Date.now() - debut;
    assert.ok(total > LIMITE, 'scénario trop rapide pour prouver quoi que ce soit : ' + total + ' ms');
    assert.ok(evenements.includes('accuse'), 'aucun accusé de réception avant l\'envoi du panneau');
    assert.equal(evenements[0], 'accuse', 'l\'envoi du panneau arrive AVANT l\'accusé : risque de timeout');
    assert.ok(it.ackAt < LIMITE, 'accusé trop tardif : ' + it.ackAt + ' ms');
    assert.ok(evenements.includes('envoi'), 'le panneau n\'a pas été envoyé');
  });

  await test('écran Réinitialiser : accusé AVANT la lecture du salon', async () => {
    store.setGuild(G, {
      bouton: {
        configure: true, categoryId: null, panelChannelId: 'P', logChannelId: 'L', staffRoleIds: [], panelMessageId: null,
        panel: {}, items: [{ id: 'a', label: 'S', emoji: '🎫', couleur: 'vert', categoryId: 'C', staffRoleIds: ['R'] }],
      },
    });
    const ordre = [];
    const g = guildLente();
    g.channels.fetch = async () => { ordre.push('lecture-salon'); await attendre(LENT); return null; };
    const it = interLente('tktb:reinit', { guild: g });
    it.deferUpdate = async () => { it.ackAt = Date.now() - it.t0; it._d = true; ordre.push('accuse'); };
    await h.handleButton(it);
    assert.equal(ordre[0], 'accuse', 'la lecture du salon arrive avant l\'accusé de réception');
    assert.ok(it.reponses.length >= 1 || it._d, 'aucune réponse');
  });

  await test('la connexion Discord ne redémarre plus le bot en boucle', async () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.js'), 'utf8');
    const bloc = src.slice(src.indexOf('// ─── Connexion à Discord avec reprise calme'), src.indexOf('store\n  .initAsync()'));
    assert.ok(/function connecter/.test(bloc), 'pas de fonction de connexion avec reprise');
    assert.ok(/function reessayerConnexion/.test(bloc), 'pas de reprise calme');
    assert.ok(/Math\.pow\(2/.test(bloc), 'pas de délai progressif entre les tentatives');
    assert.ok(!/process\.exit\(1\)[^\n]*watchdog/.test(src), 'le watchdog tue encore le processus');
    assert.ok(/reessayerConnexion\('délai de 60 s'\)/.test(src), 'le watchdog ne réessaie pas calmement');
    assert.ok(!/process\.exit\(1\);\n  \}\n\}, 60000\);/.test(src), 'l\'ancienne boucle de redémarrage est encore là');
    // Le délai doit grandir : 30 s puis 60 s puis 120 s… et plafonner à 10 min.
    assert.ok(bloc.includes('600000'), 'pas de plafond à 10 minutes');
    // Une tentative de connexion ne doit jamais rester bloquée pour toujours.
    assert.ok(/Promise\.race/.test(bloc), 'aucune limite de temps sur la tentative de connexion');
    assert.ok(repriseLibre(bloc), 'la boucle peut rester bloquée : le drapeau de reprise n\'est jamais relâché');
    function repriseLibre(txt) { return /finally\s*\{[^}]*repriseEnCours = false/.test(txt); }
  });

  console.log(`\n${ok} tests de sécurité OK${ko ? ` — ÉCHEC de ${ko}` : ' ✅'}`);
  process.exit(ko ? 1 : 0);
})();
