/**
 * tests/smoke.js — test rapide de toutes les constructions du bot
 * (panneaux, assistant, wizard, embeds) avec une fausse configuration.
 * But : attraper les erreurs AVANT l'envoi sur Discord, comme les bots pro.
 */
const h = require('../handlers/ticketHandler');

const config = {
  categoryId: '111',
  staffRoleIds: ['222', '333'],
  logChannelId: '444',
  panelChannelId: '555',
  panelSent: true,
  panelMessageId: null,
  counter: 3,
  open: {},
  panelMode: 'menu',
  panel: { titre: null, description: null, selecteur: null, image: null },
  types: [
    { id: 't1', nom: 'Problème Live', emoji: '🔴', description: 'Un souci pendant un live', categoryId: null, staffRoleIds: ['222'] },
    { id: 't2', nom: 'Signalement', emoji: '⚠️', description: null, categoryId: '666', staffRoleIds: [] },
  ],
};

let ok = 0;
function test(nom, fn) {
  try {
    fn();
    ok++;
    console.log(`  ✅ ${nom}`);
  } catch (e) {
    console.log(`  ❌ ${nom} → ${e.message}`);
    process.exitCode = 1;
  }
}

console.log('── Panneaux ──');
test('panneau MENU (components v2 : textes + séparateurs + image + menu)', () => {
  const p = h.construirePanneau(config, {}, 'Serveur Test');
  const j = JSON.stringify(p.components);
  if (!j.includes('Informations importantes')) throw new Error('texte par défaut absent');
  if (!j.includes('tkt:type-ouvrir')) throw new Error('menu déroulant absent');
  if ((j.match(/"type":14/g) || []).length < 2) throw new Error('séparateurs gris absents');
  if ((j.match(/"type":10/g) || []).length < 3) throw new Error('blocs de texte absents');
  if (j.includes('ℹ️')) throw new Error('emoji bleu présent (la référence utilise ⓘ monochrome)');
  if (j.includes('__**Informations')) {} else throw new Error('souligné absent');
  if (!j.includes('*Merci de votre patience')) throw new Error('italique absent');
});
test('structure référence : carte conteneur (17) + sélecteur hors carte + séparateurs serrés', () => {
  const p = h.construirePanneau(config, {}, 'Serveur Test');
  const j = p.components.map(c => c.toJSON());
  if (j[0].type !== 17) throw new Error('pas de carte conteneur en premier : ' + j[0].type);
  if (j[0].accent_color) throw new Error('accent coloré sur la carte (la référence n’en a pas)');
  if (j.length !== 1) throw new Error('tout doit être DANS la carte (1 seul component) : ' + j.length);
  const internes = j[0].components.map(c => c.type).join(',');
  if (internes !== '10,10,14,10,14,10,12,1') throw new Error('contenu carte : ' + internes);
  const seps = j[0].components.filter(c => c.type === 14);
  if (seps.some(sep => sep.spacing !== 1)) throw new Error('séparateurs pas serrés (Small)');
  const dern = j[0].components[j[0].components.length - 1];
  if (dern.type !== 1 || dern.components[0].type !== 3) throw new Error('le sélecteur doit être DEDANS la carte, tout en bas');
});
test('panneau BOUTON', () => {
  const p = h.construirePanneau({ ...config, panelMode: 'bouton' }, {}, 'Serveur Test');
  const j = JSON.stringify(p.components);
  if (!j.includes('Ouvrir un ticket')) throw new Error('bouton absent');
});
test('panneau avec textes perso + image', () => {
  const p = h.construirePanneau({ ...config, panel: { titre: 'Mon titre', description: 'Mon texte', selecteur: 'Choisis...', image: 'https://x.fr/i.png' } }, {}, 'S');
  const j = JSON.stringify(p.components);
  if (!j.includes('Mon titre')) throw new Error('titre perso ignoré');
  if (!j.includes('Mon texte')) throw new Error('description perso ignorée');
  if (!j.includes('https://x.fr/i.png')) throw new Error('image perso ignorée');
  if (p.files.length) throw new Error('pas de bannière auto quand image perso');
});
test('bannière auto-générée (components v2) + aucune bordure embed', () => {
  const p = h.construirePanneau({ ...config, panel: {} }, {}, 'Mon Serveur');
  if (!p.files || !p.files[0].name.startsWith('banniere-')) throw new Error('bannière absente');
  const j = JSON.stringify(p.components);
  if (!j.includes('attachment://' + p.files[0].name)) throw new Error('image absente des components');
  if (p.embeds) throw new Error('encore un embed (la référence n\'en a pas)');
});
test('panneau menu sans types → retombe en bouton', () => {
  const p = h.construirePanneau({ ...config, types: [] }, {}, 'S');
  if (!JSON.stringify(p.components).includes('Ouvrir un ticket')) throw new Error('mauvais repli');
});

console.log('── Assistant ──');
test('embed assistant', () => {
  const e = h.embedAssistant(config);
  if (!e.data.description.includes('Types actuels (2)')) throw new Error('liste des types absente');
});
test('menu assistant (25 options max)', () => {
  const gros = { ...config, types: Array.from({ length: 30 }, (_, i) => ({ id: 't' + i, nom: 'Type ' + i, emoji: null, description: null, categoryId: null, staffRoleIds: [] })) };
  const r = h.rowAssistant(gros);
  const n = r.components[0].options.length;
  if (n > 25) throw new Error('trop d\'options : ' + n);
});
for (const step of ['nom', 'emoji', 'desc', 'cat', 'roles', 'fin']) {
  test(`wizard étape ${step}`, () => {
    const e = h.embedWizard(config.types[0], config, step);
    const r = h.rowWizard('t1', step);
    if (!e.data.description || r.components.length === 0) throw new Error('étape vide');
  });
}

console.log('── Tickets ──');
test('embed ticket avec type', () => {
  const e = h.embedTicket({ numero: 4, userId: '9', sujet: 'Test', typeNom: 'Problème Live', typeEmoji: '🔴', claimedBy: null, createdAt: Date.now() });
  if (!e.data.fields.some(f => f.name === 'Type')) throw new Error('champ type absent');
});
test('boutons ticket (claim désactivé si pris)', () => {
  const r = h.boutonsTicket({ claimedBy: '7' });
  if (!r.components[0].data.disabled) throw new Error('claim non désactivé');
});
test('estStaff / estStaffTicket', () => {
  const membre = { roles: { cache: new Map([['222', true]]) } };
  if (!h.estStaff(membre, config)) throw new Error('estStaff faux');
  if (!h.estStaffTicket(membre, config, { staffRoleIds: ['222'] })) throw new Error('estStaffTicket faux');
  if (h.estStaffTicket(membre, config, { staffRoleIds: ['999'] })) throw new Error('estStaffTicket trop large');
});
test('modePanneau', () => {
  if (h.modePanneau({ ...config, panelMode: 'menu', types: [] }) !== 'bouton') throw new Error('menu sans types');
  if (h.modePanneau({ ...config, panelMode: null }) !== 'menu') throw new Error('auto menu');
});

console.log('── components v2 : flag IS_COMPONENTS_V2 ──');
test('panneau MENU porte le flag v2 (32768)', () => {
  const p = h.construirePanneau(config, {}, 'Serveur Test');
  if (p.flags !== 32768) throw new Error('flags = ' + p.flags);
  if (!p.components.length) throw new Error('components vides');
});
test('panneau BOUTON porte le flag v2 (32768)', () => {
  const p = h.construirePanneau({ ...config, panelMode: 'bouton', types: [] }, {}, 'Serveur Test');
  if (p.flags !== 32768) throw new Error('flags = ' + p.flags);
});

console.log(`\n${ok} tests OK${process.exitCode ? ' — DES TESTS ONT ÉCHOUÉ' : ' — tout est propre ✅'}`);
