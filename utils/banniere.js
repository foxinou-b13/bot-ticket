// ════════════════════════════════════════════════════════
// FABRIQUE DE BANNIÈRE PNG (sans aucune dépendance)
// Modèle des bots de support pro : cadre bordeaux, liseré
// rouge à gauche, fond bleu nuit, bande rouge inclinée à
// droite, casque-micro dans un carré arrondi, trait rouge
// au-dessus de « SUPPORT » (sans sérif), nom du serveur en
// gras SÉRIF (police vectorielle dessinée à la main).
// ════════════════════════════════════════════════════════
const zlib = require('zlib');

// ─── Police vectorielle : traits (polylignes) en boîte 100 de haut ───
// Chaque glyphe = liste de polylignes [[x,y], ...]
// Arc elliptique → liste de points (pour les courbes rondes)
function A(cx, cy, rx, ry, a0, a1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a))]);
  }
  return pts;
}
const suite = (...morceaux) => morceaux.reduce((acc, m) => acc.concat(m), []);
const PI = Math.PI;

// ─── Police vectorielle sérif : traits + arcs ───
const G = {
  'A': [[[0, 100], [33, 0], [66, 100]], [[12, 64], [54, 64]]],
  'B': [[[0, 0], [0, 100]], suite([[0, 0]], A(28, 25, 34, 25, -PI / 2, PI / 2, 10), [[0, 50]]), suite([[0, 50]], A(30, 75, 36, 25, -PI / 2, PI / 2, 10), [[0, 100]])],
  'C': [A(33, 50, 33, 50, -0.75, -5.53, 18)],
  'D': [[[0, 0], [0, 100]], suite([[0, 0]], A(28, 50, 38, 50, -PI / 2, PI / 2, 14), [[0, 100]])],
  'E': [[[56, 0], [0, 0], [0, 100], [56, 100]], [[0, 50], [44, 50]]],
  'F': [[[56, 0], [0, 0], [0, 100]], [[0, 50], [44, 50]]],
  'G': [suite(A(33, 50, 33, 50, -0.75, -5.53, 18), [[62, 68], [62, 56], [40, 56]])],
  'H': [[[0, 0], [0, 100]], [[66, 0], [66, 100]], [[0, 50], [66, 50]]],
  'I': [[[0, 0], [44, 0]], [[22, 0], [22, 100]], [[0, 100], [44, 100]]],
  'J': [suite([[66, 0], [66, 70]], A(36, 70, 30, 30, 0, PI - 0.35, 10))],
  'K': [[[0, 0], [0, 100]], [[62, 0], [0, 56]], [[24, 44], [64, 100]]],
  'L': [[[0, 0], [0, 100], [54, 100]]],
  'M': [[[0, 100], [0, 0], [39, 52], [78, 0], [78, 100]]],
  'N': [[[0, 100], [0, 0], [66, 100], [66, 0]]],
  'O': [suite(A(33, 50, 33, 50, -PI / 2, 3 * PI / 2, 18), [[33, 0]])],
  'P': [[[0, 100], [0, 0]], suite([[0, 0]], A(28, 27, 36, 27, -PI / 2, PI / 2, 10), [[0, 54]])],
  'Q': [suite(A(33, 50, 33, 50, -PI / 2, 3 * PI / 2, 18), [[33, 0]]), [[44, 74], [70, 104]]],
  'R': [[[0, 100], [0, 0]], suite([[0, 0]], A(28, 27, 36, 27, -PI / 2, PI / 2, 10), [[0, 54]]), [[30, 54], [64, 100]]],
  'S': [suite(A(34, 27, 30, 26, 0.25, -3.0, 10), [[33, 50]], A(32, 73, 32, 26, -1.7, 0.95, 10), [[18, 100], [2, 88]])],
  'T': [[[0, 0], [66, 0]], [[33, 0], [33, 100]]],
  'U': [suite([[0, 0], [0, 52]], A(33, 52, 33, 48, PI, 0, 12), [[66, 52], [66, 0]])],
  'V': [[[0, 0], [33, 100], [66, 0]]],
  'W': [[[0, 0], [17, 100], [42, 36], [67, 100], [84, 0]]],
  'X': [[[0, 0], [66, 100]], [[66, 0], [0, 100]]],
  'Y': [[[0, 0], [33, 52], [66, 0]], [[33, 52], [33, 100]]],
  'Z': [[[0, 0], [66, 0], [0, 100], [66, 100]]],
  '0': [suite(A(33, 50, 33, 50, -PI / 2, 3 * PI / 2, 18), [[33, 0]])],
  '1': [[[14, 16], [34, 0], [34, 100]], [[10, 100], [58, 100]]],
  '2': [suite(A(33, 26, 33, 26, 2.74, 6.48, 12), [[66, 44], [0, 100], [66, 100]])],
  '3': [suite(A(32, 25, 32, 25, 2.8, 6.6, 10), A(34, 72, 32, 28, -1.6, 1.0, 10), [[18, 100], [2, 90]])],
  '4': [[[46, 0], [0, 66], [66, 66]], [[46, 0], [46, 100]]],
  '5': [[[62, 0], [0, 0], [0, 44], [30, 44]], suite(A(32, 72, 32, 28, -PI / 2, 0.95, 10), [[18, 100], [2, 88]])],
  '6': [suite([[60, 4], [30, 2], [12, 20], [2, 48]], A(33, 72, 33, 28, -PI / 2, 3 * PI / 2, 14))],
  '7': [[[0, 0], [66, 0], [26, 100]]],
  '8': [A(33, 26, 27, 26, -PI / 2, 3 * PI / 2, 12), A(33, 74, 31, 26, -PI / 2, 3 * PI / 2, 12)],
  '9': [suite([[6, 96], [36, 98], [54, 80], [64, 52]], A(33, 28, 33, 28, PI / 2, PI / 2 + 2 * PI, 14))],
  ' ': [],
  '-': [[6, 50], [58, 50]],
  '_': [[0, 100], [66, 100]],
  '|': [[22, 0], [22, 100]],
  '/': [[62, 0], [4, 100]],
  '.': [[26, 88], [26, 100]],
  ',': [[30, 86], [22, 106]],
  ':': [[26, 24], [26, 36]],
  '!': [[[22, 0], [22, 68]], [[22, 88], [22, 100]]],
  '?': [suite(A(33, 22, 31, 22, PI, 0.2, 10), [[33, 52], [33, 68]]), [[33, 88], [33, 100]]],
  "'": [[[22, 0], [22, 30]]],
  '&': [[[62, 100], [10, 44], [10, 16], [28, 0], [44, 0], [58, 14], [58, 34], [10, 78], [22, 100], [46, 100], [62, 84]]],
  '+': [[[33, 20], [33, 80]], [[6, 50], [60, 50]]],
  '(': [A(60, 50, 40, 60, -2.2, 2.2, 10)],
  ')': [A(6, 50, 40, 60, -0.94, 0.94, 10)],
  '[': [[[52, 0], [14, 0], [14, 100], [52, 100]]],
  ']': [[[14, 0], [52, 0], [52, 100], [14, 100]]],
  '#': [[[10, 30], [62, 30]], [[10, 66], [62, 66]], [[26, 0], [18, 100]], [[48, 0], [40, 100]]],
  '*': [[[33, 20], [33, 80]], [[8, 35], [58, 65]], [[58, 35], [8, 65]]],
  '=': [[[6, 36], [60, 36]], [[6, 64], [60, 64]]],
  '<': [[[58, 0], [8, 50], [58, 100]]],
  '>': [[[8, 0], [58, 50], [8, 100]]],
};

const LARGEURS = { M: 78, W: 84, I: 44, ' ': 36 };

// ─── Palette du modèle de référence ───
const CADRE = [110, 30, 42];
const LISERE = [178, 48, 61];
const FOND = [27, 36, 48];
const ROUGE = [178, 48, 61];
const BORDEAUX = [122, 36, 48];
const CARRE = [35, 47, 61];
const CARRE_BORD = [124, 147, 168];
const BLANC = [242, 244, 246];

function nettoyerNom(nom) {
  return String(nom || 'SERVEUR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 |\-_'&/().!?#*+=<>[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 34);
}

function poserPixel(data, W, H, x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  data[i] = c[0];
  data[i + 1] = c[1];
  data[i + 2] = c[2];
  data[i + 3] = 255;
}

// Distance point → segment
function distSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function trait(px, W, H, ax, ay, bx, by, ep, couleur) {
  const x0 = Math.floor(Math.min(ax, bx) - ep);
  const x1 = Math.ceil(Math.max(ax, bx) + ep);
  const y0 = Math.floor(Math.min(ay, by) - ep);
  const y1 = Math.ceil(Math.max(ay, by) + ep);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (distSegment(x, y, ax, ay, bx, by) <= ep / 2) poserPixel(data2, W, H, x, y, couleur);
    }
  }
}
let data2 = null; // buffer courant (utilisé par trait)

function barreSerif(px, W, H, x, y, horizontale, couleur) {
  // petite barre de sérif centrée sur (x,y)
  if (horizontale) {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -10; dx <= 10; dx++) poserPixel(data2, W, H, x + dx, y + dy, couleur);
  } else {
    for (let dy = -6; dy <= 6; dy++) for (let dx = -3; dx <= 3; dx++) poserPixel(data2, W, H, x + dx, y + dy, couleur);
  }
}

function texteLargeur(texte, hauteur, espacement) {
  const sc = hauteur / 100;
  let l = 0;
  for (const c of texte) l += ((LARGEURS[c] || 66) + 14) * sc + espacement;
  return l - espacement;
}

function dessinerTexte(px, W, H, x, y, texte, hauteur, couleur, espacement, serifs, graisse = 13) {
  const sc = hauteur / 100;
  const base = Math.max(2, graisse * sc);
  let cx = x;
  for (const c of texte) {
    const glyph = G[c];
    if (glyph) {
      for (const poly of glyph) {
        for (let i = 0; i < poly.length - 1; i++) {
          const ax = cx + poly[i][0] * sc;
          const ay = y + poly[i][1] * sc;
          const bx = cx + poly[i + 1][0] * sc;
          const by = y + poly[i + 1][1] * sc;
          const dxs = Math.abs(poly[i + 1][0] - poly[i][0]);
          const dys = Math.abs(poly[i + 1][1] - poly[i][1]);
          // contraste typographique : vertical épais, horizontal fin, diagonale medium
          const ep = dxs < 1 ? base * 1.45 : dys < 1 ? base * 0.75 : base * 0.9;
          trait(px, W, H, ax, ay, bx, by, ep, couleur);
          if (serifs) {
            const vertical = Math.abs(poly[i][0] - poly[i + 1][0]) === 0 && Math.abs(poly[i][1] - poly[i + 1][1]) > 50;
            const horizontal = Math.abs(poly[i][1] - poly[i + 1][1]) === 0 && Math.abs(poly[i][0] - poly[i + 1][0]) > 30;
            if (vertical) {
              // sérifs uniquement en haut (y=0) et en bas (y=100) des jambages
              if (poly[i][1] <= 2 || poly[i][1] >= 98) barreSerif(px, W, H, (ax + bx) / 2, ay, true, couleur);
              if (poly[i + 1][1] <= 2 || poly[i + 1][1] >= 98) barreSerif(px, W, H, (ax + bx) / 2, by, true, couleur);
            } else if (horizontal) {
              barreSerif(px, W, H, ax, ay, false, couleur);
              barreSerif(px, W, H, bx, by, false, couleur);
            }
          }
        }
      }
    }
    cx += ((LARGEURS[c] || 66) + 14) * sc + espacement;
  }
}

// ─── Encodeur PNG minimal (RGBA, filtre 0) ───
const TABLE_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLE_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, donnees) {
  const long = Buffer.alloc(4);
  long.writeUInt32BE(donnees.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), donnees]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([long, td, crc]);
}

function encoderPNG(largeur, hauteur, data) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const brut = Buffer.alloc((largeur * 4 + 1) * hauteur);
  for (let y = 0; y < hauteur; y++) {
    brut[y * (largeur * 4 + 1)] = 0;
    data.copy(brut, y * (largeur * 4 + 1) + 1, y * largeur * 4, (y + 1) * largeur * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(brut, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function sdfRectArrondi(x, y, x0, y0, x1, y1, r) {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hx = (x1 - x0) / 2 - r;
  const hy = (y1 - y0) / 2 - r;
  const dx = Math.max(Math.abs(x - cx) - hx, 0);
  const dy = Math.max(Math.abs(y - cy) - hy, 0);
  return Math.hypot(dx, dy) + Math.min(Math.max(Math.abs(x - cx) - hx, Math.abs(y - cy) - hy), 0) - r;
}

// ─── La bannière elle-même ───
function genererBanniere(nomServeur) {
  const W = 1000;
  const H = 375;
  const data = Buffer.alloc(W * H * 4);
  data2 = data;
  const px = { data, height: H };
  const nom = nettoyerNom(nomServeur);

  // Fond bleu nuit
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) poserPixel(data, W, H, x, y, FOND);

  // Bande rouge inclinée à droite
  for (let y = 0; y < H; y++) {
    const bord = 755 - Math.round((y / H) * 65);
    for (let x = bord; x < W; x++) poserPixel(data, W, H, x, y, ROUGE);
  }

  // Points décoratifs près de la diagonale (rouge clair, comme la référence)
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      for (let sy = 0; sy < 6; sy++) {
        for (let sx = 0; sx < 6; sx++) poserPixel(data, W, H, 726 + gx * 15 + sx, 172 + gy * 15 + sy, [205, 92, 102]);
      }
    }
  }

  // Carré arrondi bordé + casque-micro
  const q0x = 762, q0y = 92, q1x = 952, q1y = 282;
  for (let y = q0y - 4; y <= q1y + 4; y++) {
    for (let x = q0x - 4; x <= q1x + 4; x++) {
      const d = sdfRectArrondi(x, y, q0x, q0y, q1x, q1y, 22);
      if (d <= 0) poserPixel(data, W, H, x, y, CARRE);
      if (d > -3.5 && d <= 0) poserPixel(data, W, H, x, y, CARRE_BORD);
    }
  }
  const cx = 857, cy = 187;
  for (let y = cy - 60; y <= cy + 75; y++) {
    for (let x = cx - 70; x <= cx + 70; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist >= 40 && dist <= 48 && y <= cy + 4) poserPixel(data, W, H, x, y, BLANC);
      const ang = Math.atan2(y - cy, x - cx);
      if (dist >= 52 && dist <= 58 && ang > 0.25 && ang < 1.45) poserPixel(data, W, H, x, y, BLANC);
    }
  }
  for (const ox of [cx - 58, cx + 38]) {
    for (let y = cy - 6; y <= cy + 46; y++) {
      for (let x = ox - 3; x <= ox + 23; x++) {
        const d = sdfRectArrondi(x, y, ox, cy - 3, ox + 20, cy + 43, 8);
        if (d <= 0) poserPixel(data, W, H, x, y, ROUGE);
        if (d > -3 && d <= 0) poserPixel(data, W, H, x, y, BLANC);
      }
    }
    // fente blanche verticale au milieu de l'oreillette (détail référence)
    for (let y = cy + 6; y <= cy + 34; y++) poserPixel(data, W, H, ox + 10, y, BLANC);
  }
  for (let y = cy + 50; y <= cy + 72; y++) {
    for (let x = cx - 8; x <= cx + 14; x++) {
      if (Math.hypot(x - (cx + 3), y - (cy + 61)) <= 9) poserPixel(data, W, H, x, y, ROUGE);
    }
  }

  // Trait rouge + SUPPORT (sans sérif, espacé) + nom du serveur (gras sérif)
  // Positions mesurées sur la bannière de référence (marge gauche 7,5 %)
  for (let y = 66; y < 74; y++) for (let x = 75; x < 123; x++) poserPixel(data, W, H, x, y, ROUGE);
  dessinerTexte(px, W, H, 75, 100, 'SUPPORT', 21, BLANC, 9, false, 16);
  let hauteur = 46;
  while (hauteur > 22 && texteLargeur(nom, hauteur, 1) > 520) hauteur -= 3;
  dessinerTexte(px, W, H, 75, 146, nom, hauteur, BLANC, 1, true, 14);

  // Cadre bordeaux + liseré rouge à gauche (dessinés en dernier)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x < 4 || y < 4 || x >= W - 4 || y >= H - 4) poserPixel(data, W, H, x, y, CADRE);
    }
  }
  for (let y = 4; y < H - 4; y++) {
    for (let x = 4; x < 11; x++) poserPixel(data, W, H, x, y, LISERE);
  }

  return encoderPNG(W, H, data);
}

module.exports = { genererBanniere };
