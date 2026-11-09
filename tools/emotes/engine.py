"""
tools/emotes/engine.py — moteur de rendu 3D des emotes One Assist.

Technique (celle qui fait la différence avec un simple dessin plat) :
  1. silhouette → champ de distance (distance au bord)
  2. ce champ devient une HAUTEUR → on en déduit une NORMALE de surface
  3. on éclaire cette surface (lumière haut-gauche + spéculaire)
  4. on ajoute dégradé de matière, contour épais, liseré clair, ombre portée

Résultat : un objet bombé, brillant, lisible même en 32 px.
Tout est rendu en 512×512 puis réduit à 128×128 (sur-échantillonnage ×4).
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np
import math
from scipy.ndimage import distance_transform_edt, gaussian_filter

S = 4
OUT = 128
W = OUT * S


# ─────────────────────────── matières ───────────────────────────
class Theme:
    def __init__(self, nom, haut, bas, contour, lumiere, accent):
        self.nom = nom
        self.haut = np.array(haut, dtype=np.float32)
        self.bas = np.array(bas, dtype=np.float32)
        self.contour = tuple(int(c) for c in contour)
        self.lumiere = np.array(lumiere, dtype=np.float32)
        self.accent = tuple(int(c) for c in accent)


THEMES = {
    'or':        Theme('or',        (255, 233, 150), (176, 108, 12), (72, 40, 2),   (255, 252, 224), (255, 209, 72)),
    'or_rose':   Theme('or_rose',   (255, 214, 206), (188, 82, 92),  (84, 26, 34),  (255, 244, 240), (255, 158, 168)),
    'argent':    Theme('argent',    (255, 255, 255), (138, 154, 178), (38, 46, 62), (255, 255, 255), (200, 224, 255)),
    'bronze':    Theme('bronze',    (247, 196, 132), (140, 74, 28),  (58, 28, 6),   (255, 234, 200), (214, 138, 62)),
    'rubis':     Theme('rubis',     (255, 150, 166), (150, 8, 44),   (66, 2, 20),   (255, 214, 224), (255, 58, 96)),
    'saphir':    Theme('saphir',    (150, 208, 255), (16, 66, 176),  (6, 22, 70),   (216, 240, 255), (64, 148, 255)),
    'emeraude':  Theme('emeraude',  (166, 255, 206), (8, 122, 84),   (2, 48, 34),   (222, 255, 240), (40, 220, 148)),
    'amethyste': Theme('amethyste', (216, 172, 255), (94, 34, 186),  (36, 10, 72),  (244, 226, 255), (172, 106, 255)),
    'topaze':    Theme('topaze',    (255, 224, 156), (196, 104, 8),  (70, 34, 2),   (255, 250, 220), (255, 168, 48)),
    'jade':      Theme('jade',      (198, 255, 232), (18, 138, 126), (4, 50, 48),   (240, 255, 250), (84, 232, 208)),
    'obsidienne':Theme('obsidienne',(136, 148, 178), (20, 24, 38),   (4, 6, 12),    (198, 212, 240), (96, 116, 168)),
    'perle':     Theme('perle',     (255, 255, 255), (188, 200, 226), (96, 108, 138), (255, 255, 255), (238, 246, 255)),

    'neon_cyan': Theme('neon_cyan', (198, 255, 255), (0, 158, 198),  (0, 58, 78),   (240, 255, 255), (72, 240, 255)),
    'neon_violet':Theme('neon_violet',(232, 190, 255),(104, 28, 214), (40, 2, 84),   (250, 238, 255), (188, 100, 255)),
    'neon_rose': Theme('neon_rose', (255, 186, 232), (200, 14, 122), (72, 2, 44),   (255, 232, 248), (255, 78, 182)),
    'neon_vert': Theme('neon_vert', (208, 255, 168), (40, 172, 36),  (10, 58, 8),   (242, 255, 230), (118, 250, 92)),
    'neon_ambre':Theme('neon_ambre',(255, 240, 164), (216, 124, 0),  (78, 38, 0),   (255, 252, 226), (255, 184, 36)),

    'bois':      Theme('bois',      (224, 178, 126), (114, 68, 30),  (46, 24, 8),   (246, 216, 178), (176, 118, 58)),
    'pierre':    Theme('pierre',    (212, 218, 228), (96, 104, 120), (30, 34, 44),  (238, 244, 252), (152, 164, 186)),
    'nuit':      Theme('nuit',      (124, 138, 206), (18, 20, 62),   (4, 4, 18),    (188, 202, 255), (100, 116, 216)),
    'sang':      Theme('sang',      (255, 146, 134), (134, 12, 16),  (50, 2, 4),    (255, 214, 206), (240, 56, 48)),
    'foret':     Theme('foret',     (180, 238, 162), (20, 104, 54),  (6, 40, 20),   (224, 255, 216), (86, 200, 108)),
    'ocean':     Theme('ocean',     (156, 242, 255), (10, 88, 158),  (2, 28, 62),   (222, 252, 255), (56, 182, 244)),
    'sable':     Theme('sable',     (255, 246, 208), (194, 154, 72), (76, 54, 14),  (255, 254, 238), (240, 206, 124)),
    'corail':    Theme('corail',    (255, 200, 180), (214, 74, 62),  (86, 20, 16),  (255, 240, 232), (255, 126, 106)),
}

DEFAULT = THEMES['or']

LUMIERE = np.array([-0.62, -0.66, 0.72], dtype=np.float32)
LUMIERE /= np.linalg.norm(LUMIERE)


# ─────────────────────────── outils ───────────────────────────
def _smoothstep(x, a=0.0, b=1.0):
    t = np.clip((x - a) / (b - a + 1e-6), 0, 1)
    return t * t * (3 - 2 * t)


def masque(dessin, taille=(W, W)):
    img = Image.new('L', taille, 0)
    dessin(ImageDraw.Draw(img), taille[0])
    return img


def _distance(mask_arr):
    """Distance intérieure au bord (0 au bord, croissante vers le centre)."""
    return distance_transform_edt(mask_arr > 127)


def relief(interieur, bevel=0.16, force=1.0, dome=1.0):
    """
    Hauteur → normale → éclairage. Renvoie (shade, spec) en float [0..1].
    shade : multiplicateur de couleur (relief diffus)
    spec  : reflet spéculaire à ajouter
    """
    h, w = interieur.shape
    d = _distance(interieur)
    ep = max(2.0, bevel * w)

    # hauteur : bord arrondi fin puis surface plate (profil « objet solide »)
    t = np.clip(d / ep, 0, 1)
    bord_arrondi = np.sqrt(1 - (1 - t) ** 2)          # 1/4 de cercle : franc, sans anneaux
    hauteur = (bord_arrondi ** (1.0 / max(0.25, dome))) * force

    # pente (gradient) → normale
    gy, gx = np.gradient(gaussian_filter(hauteur, max(2.0, w * 0.006)))
    k = w * 0.055
    nx = -gx * k
    ny = -gy * k
    nz = np.ones_like(nx)
    norme = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / norme, ny / norme, nz / norme

    diffuse = nx * LUMIERE[0] + ny * LUMIERE[1] + nz * LUMIERE[2]
    shade = 0.58 + 0.48 * np.clip(diffuse, -1, 1)

    # spéculaire (Blinn-Phong) : reflet net en haut-gauche
    hx, hy, hz = -LUMIERE[0], -LUMIERE[1], LUMIERE[2] + 1.0
    hn = math.sqrt(hx * hx + hy * hy + hz * hz)
    hx, hy, hz = hx / hn, hy / hn, hz / hn
    sp = np.clip(nx * hx + ny * hy + nz * hz, 0, 1) ** 42
    return shade.astype(np.float32), sp.astype(np.float32)


def gradient_v(size, haut, bas):
    h, w = size[1], size[0]
    t = np.linspace(0, 1, h)[:, None, None]
    return (haut[None, None, :] * (1 - t) + bas[None, None, :] * t).astype(np.float32) * np.ones((h, w, 1), np.float32)


def glow_nuage(size, couleur, intensite=0.55, rayon=0.42):
    """Halo rond sans bord carré (calculé en numpy, décroissance douce)."""
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((xx - w / 2) ** 2 + (yy - h / 2) ** 2) / (rayon * w)
    a = np.clip(1 - d, 0, 1) ** 2.4 * intensite
    rgba = np.zeros((h, w, 4), np.float32)
    rgba[:, :, 0:3] = np.array(couleur, dtype=np.float32)
    rgba[:, :, 3] = a * 255
    return Image.fromarray(rgba.astype(np.uint8), 'RGBA')


def peindre(interieur, theme, options=None):
    """Peint une forme intérieure avec relief 3D."""
    o = options or {}
    taille = interieur.size
    m = np.array(interieur, dtype=np.float32) / 255.0
    sol = m > 0.5

    base = gradient_v(taille, theme.haut, theme.bas)

    # teinte de matière secondaire (reflets colorés dans les zones sombres)
    accent = np.array(theme.accent, dtype=np.float32)
    base = base * 0.97 + accent * 0.03

    shade, spec = relief(np.array(interieur, dtype=np.uint8), o.get('bevel', 0.16), o.get('force', 1.0),
                         o.get('dome', 1.0))

    rgb = base * shade[:, :, None]
    rgb += spec[:, :, None] * 165 * (theme.lumiere / 255.0)

    # assombrissement des bords (contact)
    d = _distance(np.array(interieur, dtype=np.uint8))
    ep = max(2.0, 0.10 * taille[0])
    bord = (1 - _smoothstep(d, 0, ep)) * sol
    rgb *= (1 - 0.22 * bord[:, :, None])

    rgb = np.clip(rgb, 0, 255)
    img = Image.fromarray(rgb.astype(np.uint8), 'RGB').convert('RGBA')
    img.putalpha(interieur)
    return img


def composer(interieur_mask, theme, options=None):
    """Objet complet : ombre + contour + peinture + liseré clair."""
    o = options or {}
    taille = interieur_mask.size
    ep = o.get('contour', max(3, taille[0] // 78))

    corps = peindre(interieur_mask, theme, o)

    # ombre portée douce
    arr = np.array(interieur_mask, dtype=np.float32) / 255.0
    ombre = gaussian_filter(np.roll(arr, int(taille[1] * 0.035), axis=0), taille[0] * 0.022)
    ombre = np.clip(ombre * 0.55, 0, 1)

    out = np.zeros((taille[1], taille[0], 4), np.float32)
    out[:, :, 3] = ombre * 255
    out_img = Image.fromarray(out.astype(np.uint8), 'RGBA')

    # contour épais
    contour = interieur_mask.filter(ImageFilter.MaxFilter(ep * 2 + 1))
    carc = Image.new('RGBA', taille, theme.contour + (255,))
    out_img.paste(carc, (0, 0), contour)

    out_img.alpha_composite(corps)

    # liseré lumineux sur le dessus (arête éclairée)
    interieur_erode = interieur_mask.filter(ImageFilter.MinFilter(max(3, ep * 2 + 1)))
    arete = ImageChops.subtract(interieur_mask, interieur_erode)
    noir = Image.new('L', taille, 0)
    ImageDraw.Draw(noir).rectangle([0, 0, taille[0], int(taille[1] * 0.62)], fill=255)
    arete = ImageChops.multiply(arete, noir.filter(ImageFilter.GaussianBlur(taille[0] // 120)))
    clair = Image.new('RGBA', taille, tuple(int(c) for c in theme.lumiere) + (255,))
    out_img.paste(clair, (0, 0), arete.point(lambda v: int(v * 0.75)))
    return out_img


def superposer(*couches):
    base = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    for c in couches:
        if c is not None:
            base.alpha_composite(c)
    return base


def etincelle(taille_px, couleur=(255, 255, 255), epaisseur=None):
    img = Image.new('RGBA', (taille_px, taille_px), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = taille_px // 2
    e = epaisseur or max(1, taille_px // 8)
    d.polygon([(c, 0), (c + e, c - e), (taille_px, c), (c + e, c + e),
               (c, taille_px), (c - e, c + e), (0, c), (c - e, c - e)], fill=couleur + (255,))
    return img


def nettoyer(img):
    return img.resize((OUT, OUT), Image.LANCZOS)


# ─────────────────────────── arêtes / facettes ───────────────────────────
def aretes(interieur_mask, polylignes, theme, taille=None):
    """
    Arêtes internes (gemmes, cristaux, dés) : trait sombre + filet de lumière.
    L'alpha vient UNIQUEMENT des traits dessinés (jamais de la forme entière).
    """
    taille = taille or interieur_mask.size
    w, h = taille
    ep = max(2, int(w * 0.012))
    dec = max(1, int(w * 0.007))
    pts_all = [[(x * w, y * h) for x, y in ligne] for ligne in polylignes]

    def trace(dx, dy, largeur):
        m = Image.new('L', taille, 0)
        d = ImageDraw.Draw(m)
        for pts in pts_all:
            d.line([(x + dx, y + dy) for x, y in pts], fill=255, width=largeur, joint='curve')
        return ImageChops.multiply(m, interieur_mask)

    sombre = Image.new('RGBA', taille, tuple(int(c * 0.62) for c in theme.contour) + (255,))
    sombre.putalpha(trace(0, 0, ep).point(lambda v: int(v * 0.80)))

    clair = Image.new('RGBA', taille, (255, 255, 255, 255))
    clair.putalpha(trace(dec, dec, max(1, ep // 2)).point(lambda v: int(v * 0.55)))

    out = Image.new('RGBA', taille, (0, 0, 0, 0))
    out.alpha_composite(sombre)
    out.alpha_composite(clair)
    return out
