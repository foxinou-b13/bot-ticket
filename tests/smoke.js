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
test('panneau MENU (embed + selecteur)', () => {
  const p = h.construirePanneau(config, {}, 'Serveur Test');
  if (!p.embeds[0] || !p.components[0]) throw new Error('composants manquants');
  if (!p.embeds[0].data.description.includes('Informations importantes')) throw new Error('texte par défaut absent');
});
test('panneau BOUTON', () => {
  const p = h.construirePanneau({ ...config, panelMode: 'bouton' }, {}, 'Serveur Test');
  if (!p.components[0].components[0].data.label) throw new Error('bouton absent');
});
test('panneau avec textes perso + image', () => {
  const p = h.construirePanneau({ ...config, panel: { titre: 'Mon titre', description: 'Mon texte', selecteur: 'Choisis...', image: 'https://x.fr/i.png' } }, {}, 'S');
  if (p.embeds[0].data.title !== 'Mon titre') throw new Error('titre perso ignoré');
  if (!p.embeds[0].data.image) throw new Error('image ignorée');
});
test('bannière auto-générée dans l\'embed + plus de ligne bleue + séparateurs', () => {
  const p = h.construirePanneau({ ...config, panel: {} }, {}, 'Mon Serveur');
  if (!p.files || p.files[0].name !== 'banniere.png') throw new Error('bannière absente');
  const e = p.embeds[0].data;
  if (!e.image || e.image.url !== 'attachment://banniere.png') throw new Error('image absente de l\'embed');
  if (e.color !== 0x2B2D31) throw new Error('bordure visible détectée (couleur ' + e.color + ')');
  if (!e.description.includes('───')) throw new Error('séparateurs absents (l\'exemple en a)');
  if (e.description.includes('ℹ️')) throw new Error('emoji bleu présent (l\'exemple utilise ⓘ monochrome)');
  if (e.footer) throw new Error('footer présent (l\'exemple n\'en a pas)');
});
test('panneau menu sans types → retombe en bouton', () => {
  const p = h.construirePanneau({ ...config, types: [] }, {}, 'S');
  if (p.components[0].components[0].data.label !== 'Ouvrir un ticket') throw new Error('mauvais repli');
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

console.log(`\n${ok} tests OK${process.exitCode ? ' — DES TESTS ONT ÉCHOUÉ' : ' — tout est propre ✅'}`);
