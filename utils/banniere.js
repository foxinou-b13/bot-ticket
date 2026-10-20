// ════════════════════════════════════════════════════════
// FABRIQUE DE BANNIÈRE PNG (moteur de rendu professionnel)
// Reproduit le modèle des bots de support pro avec de VRAIES
// polices open-source (OFL) embarquées :
//   • PT Serif Bold  → nom du serveur (comme la référence)
//   • Poppins Bold   → « SUPPORT » espacé
// Générée automatiquement pour CHAQUE serveur (son nom).
// ════════════════════════════════════════════════════════
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

// Enregistre les polices une seule fois
if (!GlobalFonts.families.some(f => f.family === 'SerifRef')) {
  GlobalFonts.registerFromPath(path.join(__dirname, '..', 'assets', 'PT_Serif-Bold.ttf'), 'SerifRef');
}
if (!GlobalFonts.families.some(f => f.family === 'SansRef')) {
  GlobalFonts.registerFromPath(path.join(__dirname, '..', 'assets', 'Poppins-Bold.ttf'), 'SansRef');
}

// Palette mesurée sur la bannière de référence
const CADRE = [110, 30, 42];
const LISERE = [178, 48, 61];
const FOND = '#1b2430';
const ROUGE = '#b2303d';
const POINTS = '#cd5c66';
const CARRE = '#232f3d';
const CARRE_BORD = '#7c93a8';
const BLANC = '#f2f4f6';

function nettoyerNom(nom) {
  return String(nom || 'SERVEUR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 34);
}

function genererBanniere(nomServeur) {
  const W = 1000;
  const H = 375;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const nom = nettoyerNom(nomServeur);

  // Fond bleu nuit
  ctx.fillStyle = FOND;
  ctx.fillRect(0, 0, W, H);

  // Bande rouge inclinée à droite
  ctx.fillStyle = ROUGE;
  ctx.beginPath();
  ctx.moveTo(755, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, H);
  ctx.lineTo(690, H);
  ctx.closePath();
  ctx.fill();

  // Points décoratifs près de la diagonale
  ctx.fillStyle = POINTS;
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      ctx.fillRect(726 + gx * 15, 172 + gy * 15, 6, 6);
    }
  }

  // Carré arrondi bordé
  ctx.fillStyle = CARRE;
  ctx.strokeStyle = CARRE_BORD;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(762, 92, 190, 190, 22);
  ctx.fill();
  ctx.stroke();

  // Casque-micro : arche + oreillettes + fentes + micro + point
  const cx = 857;
  const cy = 187;
  ctx.strokeStyle = BLANC;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy + 4, 44, Math.PI, 2 * Math.PI);
  ctx.stroke();
  for (const ox of [cx - 58, cx + 38]) {
    ctx.fillStyle = ROUGE;
    ctx.strokeStyle = BLANC;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(ox, cy - 3, 20, 46, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = BLANC;
    ctx.fillRect(ox + 9, cy + 6, 2, 28);
  }
  ctx.strokeStyle = BLANC;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy + 8, 55, 0.15, 1.45);
  ctx.stroke();
  ctx.fillStyle = ROUGE;
  ctx.beginPath();
  ctx.arc(cx + 3, cy + 61, 9, 0, 2 * Math.PI);
  ctx.fill();

  // Trait rouge au-dessus de SUPPORT
  ctx.fillStyle = ROUGE;
  ctx.fillRect(75, 66, 48, 8);

  // SUPPORT (sans-sérif gras, espacé)
  ctx.fillStyle = BLANC;
  ctx.font = '26px SansRef';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '9px';
  ctx.textBaseline = 'top';
  ctx.fillText('SUPPORT', 75, 98);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  // Nom du serveur (vraie sérif gras, taille adaptée)
  let taille = 58;
  ctx.font = `${taille}px SerifRef`;
  while (taille > 24 && ctx.measureText(nom).width > 560) {
    taille -= 4;
    ctx.font = `${taille}px SerifRef`;
  }
  ctx.fillText(nom, 75, 148);

  // Cadre bordeaux + liseré rouge à gauche
  ctx.fillStyle = `rgb(${CADRE.join(',')})`;
  ctx.fillRect(0, 0, W, 4);
  ctx.fillRect(0, H - 4, W, 4);
  ctx.fillRect(0, 0, 4, H);
  ctx.fillRect(W - 4, 0, 4, H);
  ctx.fillStyle = `rgb(${LISERE.join(',')})`;
  ctx.fillRect(4, 4, 7, H - 8);

  return canvas.toBuffer('image/png');
}

module.exports = { genererBanniere };
