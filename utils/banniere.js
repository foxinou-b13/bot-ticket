// ════════════════════════════════════════════════════════
// FABRIQUE DE BANNIÈRE PNG (sans aucune dépendance)
// Reproduit le modèle des bots de support pro :
// cadre bordeaux, fond bleu nuit, bande rouge inclinée à
// droite, casque-micro dans un carré arrondi, trait rouge
// au-dessus de « SUPPORT », nom du serveur en grand.
// Générée automatiquement pour CHAQUE serveur (son nom).
// ════════════════════════════════════════════════════════
const zlib = require('zlib');

// ─── Police pixel 5x7 (majuscules, chiffres, symboles) ───
const FONT = {
  'A': ['.##.', '#..#', '#..#', '####', '#..#', '#..#', '#..#'],
  'B': ['###.', '#..#', '#..#', '###.', '#..#', '#..#', '###.'],
  'C': ['.###', '#...', '#...', '#...', '#...', '#...', '.###'],
  'D': ['###.', '#..#', '#..#', '#..#', '#..#', '#..#', '###.'],
  'E': ['####', '#...', '#...', '###.', '#...', '#...', '####'],
  'F': ['####', '#...', '#...', '###.', '#...', '#...', '#...'],
  'G': ['.###', '#...', '#...', '#.##', '#..#', '#..#', '.###'],
  'H': ['#..#', '#..#', '#..#', '####', '#..#', '#..#', '#..#'],
  'I': ['####', '..#.', '..#.', '..#.', '..#.', '..#.', '####'],
  'J': ['..##', '...#', '...#', '...#', '...#', '#..#', '.##.'],
  'K': ['#..#', '#.#.', '##..', '###.', '#.#.', '#..#', '#..#'],
  'L': ['#...', '#...', '#...', '#...', '#...', '#...', '####'],
  'M': ['#..#', '####', '####', '#..#', '#..#', '#..#', '#..#'],
  'N': ['#..#', '##.#', '#.##', '#..#', '#..#', '#..#', '#..#'],
  'O': ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  'P': ['###.', '#..#', '#..#', '###.', '#...', '#...', '#...'],
  'Q': ['.##.', '#..#', '#..#', '#..#', '#.##', '#..#', '.###'],
  'R': ['###.', '#..#', '#..#', '###.', '#.#.', '#..#', '#..#'],
  'S': ['.###', '#...', '#...', '.##.', '...#', '...#', '###.'],
  'T': ['####', '..#.', '..#.', '..#.', '..#.', '..#.', '..#.'],
  'U': ['#..#', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  'V': ['#..#', '#..#', '#..#', '#..#', '#..#', '.##.', '..#.'],
  'W': ['#..#', '#..#', '#..#', '#..#', '####', '####', '#..#'],
  'X': ['#..#', '#..#', '.##.', '.##.', '.##.', '#..#', '#..#'],
  'Y': ['#..#', '#..#', '.##.', '.##.', '..#.', '..#.', '..#.'],
  'Z': ['####', '...#', '..#.', '.#..', '#...', '#...', '####'],
  '0': ['.##.', '#..#', '#.##', '##.#', '#..#', '#..#', '.##.'],
  '1': ['..#.', '.##.', '..#.', '..#.', '..#.', '..#.', '####'],
  '2': ['.##.', '#..#', '...#', '..#.', '.#..', '#...', '####'],
  '3': ['###.', '...#', '...#', '.##.', '...#', '...#', '###.'],
  '4': ['...#', '..##', '.#.#', '#..#', '####', '...#', '...#'],
  '5': ['####', '#...', '###.', '...#', '...#', '#..#', '.##.'],
  '6': ['.##.', '#...', '#...', '###.', '#..#', '#..#', '.##.'],
  '7': ['####', '...#', '...#', '..#.', '..#.', '.#..', '.#..'],
  '8': ['.##.', '#..#', '#..#', '.##.', '#..#', '#..#', '.##.'],
  '9': ['.##.', '#..#', '#..#', '.###', '...#', '...#', '.##.'],
  ' ': ['....', '....', '....', '....', '....', '....', '....'],
  '-': ['....', '....', '....', '####', '....', '....', '....'],
  '_': ['....', '....', '....', '....', '....', '....', '####'],
  '|': ['..#.', '..#.', '..#.', '..#.', '..#.', '..#.', '..#.'],
  '/': ['...#', '...#', '..#.', '.#..', '#...', '#...', '#...'],
  '.': ['....', '....', '....', '....', '....', '.##.', '.##.'],
  ',': ['....', '....', '....', '....', '.##.', '.##.', '.#..'],
  ':': ['....', '.##.', '.##.', '....', '.##.', '.##.', '....'],
  '!': ['..#.', '..#.', '..#.', '..#.', '..#.', '....', '..#.'],
  '?': ['.##.', '#..#', '...#', '..#.', '..#.', '....', '..#.'],
  "'": ['..#.', '..#.', '....', '....', '....', '....', '....'],
  '&': ['.##.', '#..#', '#.#.', '.#..', '#.#.', '#..#', '.###'],
  '+': ['....', '..#.', '..#.', '####', '..#.', '..#.', '....'],
  '(': ['...#', '..#.', '.#..', '.#..', '.#..', '..#.', '...#'],
  ')': ['.#..', '..#.', '...#', '...#', '...#', '..#.', '.#..'],
  '[': ['###.', '#...', '#...', '#...', '#...', '#...', '###.'],
  ']': ['.###', '...#', '...#', '...#', '...#', '...#', '.###'],
  '#': ['.#.#', '.#.#', '####', '.#.#', '####', '.#.#', '.#.#'],
  '*': ['....', '#..#', '.##.', '####', '.##.', '#..#', '....'],
  '=': ['....', '....', '####', '....', '####', '....', '....'],
  '<': ['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'],
  '>': ['.#..', '..#.', '...#', '....', '...#', '..#.', '.#..'],
};

// ─── Palette du modèle de référence ───
const CADRE = [122, 36, 48];        // bordure bordeaux tout autour
const FOND = [27, 36, 48];          // bleu nuit
const ROUGE = [178, 48, 61];        // bande rouge
const BORDEAUX = [122, 36, 48];     // points décoratifs
const CARRE = [35, 47, 61];         // carré du casque
const CARRE_BORD = [124, 147, 168]; // bordure du carré
const BLANC = [242, 244, 246];

function nettoyerNom(nom) {
  return String(nom || 'SERVEUR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 |\-_'&/().!?#*+=<>[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

function texteLargeur(texte, echelle, espacement = 0) {
  return texte.length * (5 * echelle + espacement) - espacement - echelle;
}

function dessinerTexte(px, W, x, y, texte, echelle, couleur, espacement = 0, gras = 0) {
  let cx = x;
  for (const c of texte) {
    const g = FONT[c];
    if (g) {
      for (let ly = 0; ly < 7; ly++) {
        for (let lx = 0; lx < 4; lx++) {
          if (g[ly][lx] !== '#') continue;
          for (let o = 0; o <= gras; o++) {
            for (let sy = 0; sy < echelle; sy++) {
              for (let sx = 0; sx < echelle; sx++) {
                const X = cx + lx * echelle + sx + (o > 0 ? echelle - 1 : 0);
                const Y = y + ly * echelle + sy + (o === 2 ? echelle - 1 : 0);
                if (X >= 0 && Y >= 0 && X < W && Y < px.height) {
                  const i = (Y * W + X) * 4;
                  px.data[i] = couleur[0];
                  px.data[i + 1] = couleur[1];
                  px.data[i + 2] = couleur[2];
                  px.data[i + 3] = 255;
                }
              }
            }
          }
        }
      }
    }
    cx += 5 * echelle + espacement;
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

// Distance signée à un rectangle arrondi (pour carré + oreillettes)
function sdfRectArrondi(x, y, x0, y0, x1, y1, r) {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hx = (x1 - x0) / 2 - r;
  const hy = (y1 - y0) / 2 - r;
  const dx = Math.max(Math.abs(x - cx) - hx, 0);
  const dy = Math.max(Math.abs(y - cy) - hy, 0);
  return Math.hypot(dx, dy) + Math.min(Math.max(Math.abs(x - cx) - hx, Math.abs(y - cy) - hy), 0) - r;
}

function poserPixel(data, W, H, x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  data[i] = c[0];
  data[i + 1] = c[1];
  data[i + 2] = c[2];
  data[i + 3] = 255;
}

// ─── La bannière elle-même ───
function genererBanniere(nomServeur) {
  const W = 1000;
  const H = 375;
  const data = Buffer.alloc(W * H * 4);
  const px = { data, height: H };
  const nom = nettoyerNom(nomServeur);

  // 1. Fond bleu nuit
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) poserPixel(data, W, H, x, y, FOND);
  }

  // 2. Bande rouge inclinée à droite (penchée vers la gauche en bas)
  for (let y = 0; y < H; y++) {
    const bord = 735 - Math.round((y / H) * 60);
    for (let x = bord; x < W; x++) poserPixel(data, W, H, x, y, ROUGE);
  }

  // 3. Points décoratifs bordeaux près de la diagonale (bas)
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      for (let sy = 0; sy < 7; sy++) {
        for (let sx = 0; sx < 7; sx++) {
          poserPixel(data, W, H, 700 + gx * 16 + sx, 262 + gy * 16 + sy, BORDEAUX);
        }
      }
    }
  }

  // 4. Carré arrondi bordé + casque-micro
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
      // Arceau blanc (moitié supérieure)
      if (dist >= 38 && dist <= 50 && y <= cy + 4) poserPixel(data, W, H, x, y, BLANC);
      // Micro : quart d'anneau bas-droit
      const ang = Math.atan2(y - cy, x - cx);
      if (dist >= 52 && dist <= 58 && ang > 0.25 && ang < 1.45) poserPixel(data, W, H, x, y, BLANC);
    }
  }
  // Oreillettes rouges bordées de blanc
  for (const ox of [cx - 58, cx + 38]) {
    for (let y = cy - 6; y <= cy + 46; y++) {
      for (let x = ox - 3; x <= ox + 23; x++) {
        const d = sdfRectArrondi(x, y, ox, cy - 3, ox + 20, cy + 43, 8);
        if (d <= 0) poserPixel(data, W, H, x, y, ROUGE);
        if (d > -3 && d <= 0) poserPixel(data, W, H, x, y, BLANC);
      }
    }
  }
  // Bout rouge du micro
  for (let y = cy + 50; y <= cy + 70; y++) {
    for (let x = cx + 2; x <= cx + 22; x++) {
      if (Math.hypot(x - (cx + 12), y - (cy + 60)) <= 9) poserPixel(data, W, H, x, y, ROUGE);
    }
  }

  // 5. Textes : trait rouge, SUPPORT espacé, nom du serveur en grand
  for (let y = 62; y < 70; y++) {
    for (let x = 62; x < 110; x++) poserPixel(data, W, H, x, y, ROUGE);
  }
  dessinerTexte(px, W, 62, 92, 'SUPPORT', 3, BLANC, 8);
  let echelle = 8;
  while (echelle > 3 && texteLargeur(nom, echelle, 2) > 580) echelle--;
  dessinerTexte(px, W, 62, 152, nom, echelle, BLANC, 2, 2);

  // 6. Cadre bordeaux tout autour (dessiné en dernier)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x < 6 || y < 6 || x >= W - 6 || y >= H - 6) poserPixel(data, W, H, x, y, CADRE);
    }
  }

  return encoderPNG(W, H, data);
}

module.exports = { genererBanniere };
