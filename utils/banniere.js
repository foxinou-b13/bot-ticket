// ════════════════════════════════════════════════════════
// FABRIQUE DE BANNIÈRE PNG (sans aucune dépendance)
// Génère automatiquement une bannière de panneau avec le
// nom du serveur, dans le style des bots de support pro :
// fond bleu nuit, bande rouge à droite, casque blanc, texte.
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

// Couleurs du style « support pro »
const FOND = [13, 20, 38];        // bleu nuit
const ROUGE = [178, 32, 52];      // bande rouge
const ROUGE_FONCE = [120, 20, 34]; // cercle du casque
const BLANC = [245, 247, 250];
const ROSE = [255, 90, 110];      // petit texte SUPPORT

function nettoyerNom(nom) {
  return String(nom || 'SERVEUR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents
    .toUpperCase()
    .replace(/[^A-Z0-9 |\-_'&/().!?#*+=<>[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

function texteLargeur(texte, echelle) {
  let l = 0;
  for (const c of texte) l += 6 * echelle; // 5 pixels + 1 d'espacement
  return l - echelle;
}

function dessinerTexte(px, W, x, y, texte, echelle, couleur) {
  let cx = x;
  for (const c of texte) {
    const g = FONT[c];
    if (g) {
      for (let ly = 0; ly < 7; ly++) {
        for (let lx = 0; lx < 4; lx++) {
          if (g[ly][lx] === '#') {
            for (let sy = 0; sy < echelle; sy++) {
              for (let sx = 0; sx < echelle; sx++) {
                const X = cx + lx * echelle + sx;
                const Y = y + ly * echelle + sy;
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
    cx += 6 * echelle;
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
  ihdr[8] = 8;  // profondeur
  ihdr[9] = 6;  // RGBA
  const brut = Buffer.alloc((largeur * 4 + 1) * hauteur);
  for (let y = 0; y < hauteur; y++) {
    brut[y * (largeur * 4 + 1)] = 0; // filtre none
    data.copy(brut, y * (largeur * 4 + 1) + 1, y * largeur * 4, (y + 1) * largeur * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(brut, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── La bannière elle-même ───
function genererBanniere(nomServeur) {
  const W = 1000;
  const H = 340;
  const data = Buffer.alloc(W * H * 4);
  const px = { data, height: H };

  const nom = nettoyerNom(nomServeur);

  // Fond bleu nuit + léger dégradé vertical
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const f = 1 - (y / H) * 0.35;
      data[i] = Math.round(FOND[0] * f);
      data[i + 1] = Math.round(FOND[1] * f);
      data[i + 2] = Math.round(FOND[2] * f + 10);
      data[i + 3] = 255;
    }
  }

  // Bande rouge inclinée à droite
  for (let y = 0; y < H; y++) {
    const bord = 690 + Math.round((y / H) * 70) - 35;
    for (let x = bord; x < W; x++) {
      const i = (y * W + x) * 4;
      data[i] = ROUGE[0];
      data[i + 1] = ROUGE[1];
      data[i + 2] = ROUGE[2];
    }
  }

  // Cercle sombre + casque audio blanc
  const cx = 845;
  const cy = 170;
  for (let y = 0; y < H; y++) {
    for (let x = 700; x < W; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= 78) {
        const i = (y * W + x) * 4;
        data[i] = ROUGE_FONCE[0];
        data[i + 1] = ROUGE_FONCE[1];
        data[i + 2] = ROUGE_FONCE[2];
      }
    }
  }
  // Casque : arceau (demi-anneau) + deux oreillettes
  for (let y = 0; y < H; y++) {
    for (let x = 700; x < W; x++) {
      const d = Math.hypot(x - cx, y - (cy + 8));
      const dansAnneau = d <= 46 && d >= 32 && y <= cy + 8;
      const oreilG = x >= cx - 50 && x <= cx - 30 && y >= cy + 2 && y <= cy + 40;
      const oreilD = x >= cx + 30 && x <= cx + 50 && y >= cy + 2 && y <= cy + 40;
      if (dansAnneau || oreilG || oreilD) {
        const i = (y * W + x) * 4;
        data[i] = BLANC[0];
        data[i + 1] = BLANC[1];
        data[i + 2] = BLANC[2];
      }
    }
  }

  // Petit texte SUPPORT
  dessinerTexte(px, W, 62, 78, 'SUPPORT', 3, ROSE);

  // Nom du serveur : taille adaptée à la largeur disponible
  let echelle = 7;
  while (echelle > 3 && texteLargeur(nom, echelle) > 560) echelle--;
  dessinerTexte(px, W, 62, 130, nom, echelle, BLANC);

  // Soulignement rouge décoratif
  for (let y = 232; y < 240; y++) {
    for (let x = 62; x < 300; x++) {
      const i = (y * W + x) * 4;
      data[i] = ROUGE[0];
      data[i + 1] = ROUGE[1];
      data[i + 2] = ROUGE[2];
    }
  }

  // Mention discrète en bas
  dessinerTexte(px, W, 62, 268, 'SYSTEME DE TICKETS', 2, [150, 160, 180]);

  return encoderPNG(W, H, data);
}

module.exports = { genererBanniere };
