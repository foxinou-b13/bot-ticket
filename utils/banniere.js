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
const G = {
  'A': [[[0, 100], [33, 0], [66, 100]], [[12, 64], [54, 64]]],
  'B': [[[0, 0], [0, 100]], [[0, 0], [44, 0], [62, 14], [62, 36], [44, 50], [0, 50]], [[0, 50], [48, 50], [66, 64], [66, 86], [48, 100], [0, 100]]],
  'C': [[[62, 16], [42, 0], [24, 0], [0, 24], [0, 76], [24, 100], [42, 100], [62, 84]]],
  'D': [[[0, 0], [0, 100]], [[0, 0], [38, 0], [62, 24], [62, 76], [38, 100], [0, 100]]],
  'E': [[[56, 0], [0, 0], [0, 100], [56, 100]], [[0, 50], [44, 50]]],
  'F': [[[56, 0], [0, 0], [0, 100]], [[0, 50], [44, 50]]],
  'G': [[[62, 16], [42, 0], [24, 0], [0, 24], [0, 76], [24, 100], [42, 100], [62, 84], [62, 56], [38, 56]]],
  'H': [[[0, 0], [0, 100]], [[66, 0], [66, 100]], [[0, 50], [66, 50]]],
  'I': [[[0, 0], [44, 0]], [[22, 0], [22, 100]], [[0, 100], [44, 100]]],
  'J': [[[66, 0], [66, 78], [48, 100], [22, 100], [4, 82]]],
  'K': [[[0, 0], [0, 100]], [[62, 0], [0, 56]], [[24, 44], [64, 100]]],
  'L': [[[0, 0], [0, 100], [54, 100]]],
  'M': [[[0, 100], [0, 0], [39, 48], [78, 0], [78, 100]]],
  'N': [[[0, 100], [0, 0], [66, 100], [66, 0]]],
  'O': [[[24, 0], [42, 0], [66, 24], [66, 76], [42, 100], [24, 100], [0, 76], [0, 24], [24, 0]]],
  'P': [[[0, 100], [0, 0], [46, 0], [64, 16], [64, 38], [46, 54], [0, 54]]],
  'Q': [[[24, 0], [42, 0], [66, 24], [66, 76], [42, 100], [24, 100], [0, 76], [0, 24], [24, 0]], [[44, 74], [70, 104]]],
  'R': [[[0, 100], [0, 0], [46, 0], [64, 16], [64, 38], [46, 54], [0, 54]], [[30, 54], [64, 100]]],
  'S': [[[60, 14], [40, 0], [22, 0], [4, 14], [4, 34], [22, 50], [44, 56], [62, 70], [62, 86], [44, 100], [22, 100], [4, 86]]],
  'T': [[[0, 0], [66, 0]], [[33, 0], [33, 100]]],
  'U': [[[0, 0], [0, 76], [20, 100], [46, 100], [66, 76], [66, 0]]],
  'V': [[[0, 0], [33, 100], [66, 0]]],
  'W': [[[0, 0], [17, 100], [42, 36], [67, 100], [84, 0]]],
  'X': [[[0, 0], [66, 100]], [[66, 0], [0, 100]]],
  'Y': [[[0, 0], [33, 52], [66, 0]], [[33, 52], [33, 100]]],
  'Z': [[[0, 0], [66, 0], [0, 100], [66, 100]]],
  '0': [[[24, 0], [42, 0], [66, 24], [66, 76], [42, 100], [24, 100], [0, 76], [0, 24], [24, 0]]],
  '1': [[[14, 16], [34, 0], [34, 100]], [[10, 100], [58, 100]]],
  '2': [[[0, 18], [20, 0], [46, 0], [66, 18], [66, 38], [0, 100], [66, 100]]],
  '3': [[[0, 10], [20, 0], [46, 0], [64, 14], [64, 34], [46, 48], [18, 48]], [[46, 48], [64, 62], [64, 86], [46, 100], [20, 100], [0, 90]]],
  '4': [[[46, 0], [0, 66], [66, 66]], [[46, 0], [46, 100]]],
  '5': [[[62, 0], [0, 0], [0, 44], [40, 44], [62, 58], [62, 84], [42, 100], [18, 100], [0, 88]]],
  '6': [[[60, 4], [34, 0], [14, 18], [0, 52], [0, 78], [20, 100], [46, 100], [66, 78], [66, 60], [46, 42], [0, 42]]],
  '7': [[[0, 0], [66, 0], [26, 100]]],
  '8': [[[33, 50], [10, 38], [10, 14], [33, 0], [56, 14], [56, 38], [33, 50], [6, 62], [6, 86], [33, 100], [60, 86], [60, 62], [33, 50]]],
  '9': [[[6, 96], [32, 100], [52, 82], [66, 48], [66, 22], [46, 0], [20, 0], [0, 22], [0, 40], [20, 58], [66, 58]]],
  ' ': [],
  '-': [[6, 50], [58, 50]],
  '_': [[0, 100], [66, 100]],
  '|': [[22, 0], [22, 100]],
  '/': [[62, 0], [4, 100]],
  '.': [[[26, 88], [26, 100]]],
  ',': [[[30, 86], [22, 106]]],
  ':': [[[26, 24], [26, 36]], [[26, 76], [26, 88]]],
  '!': [[[22, 0], [22, 68]], [[22, 88], [22, 100]]],
  '?': [[[0, 14], [20, 0], [46, 0], [64, 14], [64, 34], [33, 52], [33, 68]], [[33, 88], [33, 100]]],
  "'": [[[22, 0], [22, 30]]],
  '&': [[[62, 100], [10, 44], [10, 16], [28, 0], [44, 0], [58, 14], [58, 34], [10, 78], [22, 100], [46, 100], [62, 84]]],
  '+': [[33, 20], [33, 80]],
  '(': [[[52, 0], [30, 30], [30, 70], [52, 100]]],
  ')': [[[14, 0], [36, 30], [36, 70], [14, 100]]],
  '[': [[[52, 0], [14, 0], [14, 100], [52, 100]]],
  ']': [[[14, 0], [52, 0], [52, 100], [14, 100]]],
  '#': [[[10, 30], [62, 30]], [[10, 66], [62, 66]], [[26, 0], [18, 100]], [[48, 0], [40, 100]]],
  '*': [[[33, 20], [33, 80]], [[8, 35], [58, 65]], [[58, 35], [8, 65]]],
  '=': [[6, 36], [60, 36]],
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
    for (let dy = -4; dy <= 4; dy++) for (let dx = -14; dx <= 14; dx++) poserPixel(data2, W, H, x + dx, y + dy, couleur);
  } else {
    for (let dy = -7; dy <= 7; dy++) for (let dx = -4; dx <= 4; dx++) poserPixel(data2, W, H, x + dx, y + dy, couleur);
  }
}

function texteLargeur(texte, hauteur, espacement) {
  const sc = hauteur / 100;
  let l = 0;
  for (const c of texte) l += ((LARGEURS[c] || 66) + 14) * sc + espacement;
  return l - espacement;
}

function dessinerTexte(px, W, H, x, y, texte, hauteur, couleur, espacement, serifs) {
  const sc = hauteur / 100;
  const ep = Math.max(2, 15 * sc);
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
    const bord = 735 - Math.round((y / H) * 60);
    for (let x = bord; x < W; x++) poserPixel(data, W, H, x, y, ROUGE);
  }

  // Points décoratifs bordeaux près de la diagonale
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      for (let sy = 0; sy < 7; sy++) {
        for (let sx = 0; sx < 7; sx++) poserPixel(data, W, H, 700 + gx * 16 + sx, 262 + gy * 16 + sy, BORDEAUX);
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
      if (dist >= 38 && dist <= 50 && y <= cy + 4) poserPixel(data, W, H, x, y, BLANC);
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
  }
  for (let y = cy + 50; y <= cy + 70; y++) {
    for (let x = cx + 2; x <= cx + 22; x++) {
      if (Math.hypot(x - (cx + 12), y - (cy + 60)) <= 9) poserPixel(data, W, H, x, y, ROUGE);
    }
  }

  // Trait rouge + SUPPORT (sans sérif, espacé) + nom du serveur (gras sérif)
  for (let y = 60; y < 68; y++) for (let x = 62; x < 110; x++) poserPixel(data, W, H, x, y, ROUGE);
  dessinerTexte(px, W, H, 62, 88, 'SUPPORT', 26, BLANC, 10, false);
  let hauteur = 62;
  while (hauteur > 26 && texteLargeur(nom, hauteur, 2) > 570) hauteur -= 4;
  dessinerTexte(px, W, H, 62, 152, nom, hauteur, BLANC, 2, true);

  // Cadre bordeaux + liseré rouge à gauche (dessinés en dernier)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x < 5 || y < 5 || x >= W - 5 || y >= H - 5) poserPixel(data, W, H, x, y, CADRE);
    }
  }
  for (let y = 5; y < H - 5; y++) {
    for (let x = 5; x < 15; x++) poserPixel(data, W, H, x, y, LISERE);
  }

  return encoderPNG(W, H, data);
}

module.exports = { genererBanniere };
