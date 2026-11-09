"""tools/emotes/shapes3.py — silhouettes (partie 3 : animaux, fun, système,
premium, divers)."""
from PIL import Image, ImageDraw
import math
from .shapes import _b, _box, _poly


def _tete(d, s, oreilles='rondes'):
    """Tête d'animal générique (base commune)."""
    x, y, w, h = _box(s)
    if oreilles == 'pointues':
        d.polygon([(x + w * .04, y + h * .44), (x + w * .10, y + h * .00),
                   (x + w * .44, y + h * .26)], fill=255)
        d.polygon([(x + w * .96, y + h * .44), (x + w * .90, y + h * .00),
                   (x + w * .56, y + h * .26)], fill=255)
    elif oreilles == 'rondes':
        d.ellipse([x + w * .00, y + h * .02, x + w * .34, y + h * .36], fill=255)
        d.ellipse([x + w * .66, y + h * .02, x + w * 1.00, y + h * .36], fill=255)
    elif oreilles == 'longues':
        d.ellipse([x + w * .22, y - h * .10, x + w * .42, y + h * .40], fill=255)
        d.ellipse([x + w * .58, y - h * .10, x + w * .78, y + h * .40], fill=255)
    d.ellipse([x + w * .04, y + h * .16, x + w * .96, y + h * 1.02], fill=255)


def chat(d, s):
    _tete(d, s, 'pointues')


def chien(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x - w * .02, y + h * .10, x + w * .32, y + h * .62], fill=255)
    d.ellipse([x + w * .68, y + h * .10, x + w * 1.02, y + h * .62], fill=255)
    d.ellipse([x + w * .06, y + h * .10, x + w * .94, y + h * 1.02], fill=255)


def renard(d, s):
    _tete(d, s, 'pointues')


def panda(d, s):
    _tete(d, s, 'rondes')


def lapin(d, s):
    _tete(d, s, 'longues')


def ours(d, s):
    _tete(d, s, 'rondes')


def loup(d, s):
    _tete(d, s, 'pointues')


def licorne(d, s):
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y - h * .04), (x + w * .60, y + h * .28),
               (x + w * .40, y + h * .28)], fill=255)
    d.ellipse([x + w * .06, y + h * .18, x + w * .94, y + h * 1.02], fill=255)


def grenouille(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .02, y + h * .10, x + w * .42, y + h * .46], fill=255)
    d.ellipse([x + w * .58, y + h * .10, x + w * .98, y + h * .46], fill=255)
    d.ellipse([x + w * .04, y + h * .30, x + w * .96, y + h * 1.00], fill=255)


def pingouin(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .10, y, x + w * .90, y + h], fill=255)
    d.ellipse([x + w * .24, y + h * .30, x + w * .76, y + h * .98], fill=0)
    d.ellipse([x + w * .24, y + h * .34, x + w * .76, y + h * 1.02], fill=255)


def abeille(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .06, y + h * .22, x + w * .94, y + h * .82], fill=255)
    d.ellipse([x + w * .02, y + h * .06, x + w * .34, y + h * .34], fill=255)
    d.ellipse([x + w * .66, y + h * .06, x + w * .98, y + h * .34], fill=255)


def papillon(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x, y + h * .06, x + w * .46, y + h * .52], fill=255)
    d.ellipse([x + w * .54, y + h * .06, x + w, y + h * .52], fill=255)
    d.ellipse([x + w * .04, y + h * .46, x + w * .42, y + h * .96], fill=255)
    d.ellipse([x + w * .58, y + h * .46, x + w * .96, y + h * .96], fill=255)
    d.rectangle([x + w * .46, y + h * .16, x + w * .54, y + h * .90], fill=255)


def patte(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .18, y + h * .42, x + w * .82, y + h], fill=255)
    for cx in (0.10, 0.34, 0.58, 0.82):
        d.ellipse([x + w * (cx - .01), y + h * .06, x + w * (cx + .19), y + h * .42], fill=255)


def poisson(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x, y + h * .18, x + w * .80, y + h * .82], fill=255)
    d.polygon([(x + w * .78, y + h * .50), (x + w, y + h * .16), (x + w, y + h * .84)], fill=255)


def oiseau(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .10, y + h * .20, x + w * .90, y + h * .86], fill=255)
    d.polygon([(x + w * .86, y + h * .44), (x + w, y + h * .34), (x + w * .86, y + h * .58)], fill=255)


def serpent(d, s):
    x, y, w, h = _box(s)
    for i, (yy, xx, ww) in enumerate(((0.10, .16, .68), (0.44, .02, .70), (0.74, .26, .68))):
        d.rounded_rectangle([x + w * xx, y + h * yy, x + w * (xx + ww), y + h * (yy + .22)],
                            radius=int(w * .11), fill=255)
    d.ellipse([x + w * .74, y, x + w * .98, y + h * .26], fill=255)


# ══════════════════════ FUN ══════════════════════
def fete(d, s):
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .62, y + h * .30),
               (x + w * .94, y + h * .60), (x + w * .66, y + h * .96),
               (x + w * .30, y + h * .80), (x + w * .18, y + h * .44)], fill=255)


def masque(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x, y + h * .18, x + w, y + h * .96], fill=255)
    d.polygon([(x + w * .14, y + h * .30), (x + w * .02, y), (x + w * .34, y + h * .22)], fill=255)
    d.polygon([(x + w * .86, y + h * .30), (x + w * .98, y), (x + w * .66, y + h * .22)], fill=255)


def bombe_fun(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .02, y + h * .24, x + w * .98, y + h * 1.00], fill=255)
    d.ellipse([x + w * .34, y + h * .02, x + w * .66, y + h * .34], fill=255)


def chapeau_fete(d, s):
    _poly(d, [(0.50, 0.02), (0.92, 0.92), (0.08, 0.92)])
    x, y, w, h = _box(s)
    d.ellipse([x + w * .20, y + h * .02, x + w * .34, y + h * .16], fill=255)


def glacon(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .06, y + h * .06, x + w * .94, y + h * .94],
                        radius=int(w * .30), fill=255)


def bulle_savon(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .04, y + h * .04, x + w * .66, y + h * .66], fill=255)
    d.ellipse([x + w * .58, y + h * .52, x + w * .90, y + h * .84], fill=255)


def etincelle(d, s):
    _poly(d, [(0.50, 0.00), (0.62, 0.38), (1.00, 0.50), (0.62, 0.62),
              (0.50, 1.00), (0.38, 0.62), (0.00, 0.50), (0.38, 0.38)])


def oeil_rieur(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x, y + h * .20, x + w, y + h * .86], fill=255)
    d.arc([x + w * .26, y + h * .46, x + w * .74, y + h * .92], 200, 340, fill=0, width=int(w * .08))


def larme(d, s):
    """Feuille / goutte : pointe en haut, base large, nervure centrale."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .84, y + h * .34), (x + w * .78, y + h * .74),
               (x + w * .50, y + h), (x + w * .22, y + h * .74),
               (x + w * .16, y + h * .34)], fill=255)
    d.line([(x + w * .50, y + h * .10), (x + w * .50, y + h * .92)], fill=0, width=int(w * .05))
    for i in range(3):
        yy = y + h * (.28 + i * .22)
        d.line([(x + w * .50, yy), (x + w * (.70 - i * .04), yy - h * .10)], fill=0, width=int(w * .035))
        d.line([(x + w * .50, yy), (x + w * (.30 + i * .04), yy - h * .10)], fill=0, width=int(w * .035))
def question(d, s):
    _poly(d, [(0.50, 0.00), (0.50, 0.00), (0.50, 0.00)])


def smiley(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x, y, x + w, y + h], fill=255)


def zombie(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .08, y + h * .10, x + w * .92, y + h], radius=int(w * .26), fill=255)
    d.rectangle([x + w * .30, y + h * .12, x + w * .34, y + h * .40], fill=0)


def robot(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .06, y + h * .26, x + w * .94, y + h * .86],
                        radius=int(w * .16), fill=255)
    d.rounded_rectangle([x + w * .16, y + h * .00, x + w * .84, y + h * .22],
                        radius=int(w * .10), fill=255)
    d.rectangle([x + w * .44, y + h * .16, x + w * .56, y + h * .34], fill=255)
    d.ellipse([x + w * .24, y + h * .46, x + w * .42, y + h * .66], fill=0)
    d.ellipse([x + w * .58, y + h * .46, x + w * .76, y + h * .66], fill=0)


def fantome(d, s):
    x, y, w, h = _box(s)
    d.pieslice([x + w * .06, y + h * .10, x + w * .94, y + h * .94], 180, 360, fill=255)
    d.rectangle([x + w * .06, y + h * .50, x + w * .94, y + h * .84], fill=255)
    for i in range(4):
        cx = 0.06 + i * 0.29
        d.ellipse([x + w * cx, y + h * .70, x + w * (cx + .15), y + h * .96], fill=0)
    d.rectangle([x + w * .06, y + h * .70, x + w * .94, y + h * .80], fill=255)


def coeur_brisе(d, s):
    x, y, w, h = _box(s)
    d.pieslice([x, y + h * .04, x + w * .56, y + h * .64], 180, 360, fill=255)
    d.pieslice([x + w * .44, y + h * .04, x + w, y + h * .64], 180, 360, fill=255)
    d.polygon([(x, y + h * .44), (x + w * .5, y + h), (x + w, y + h * .44)], fill=255)


def diable(d, s):
    x, y, w, h = _box(s)
    d.polygon([(x + w * .10, y + h * .26), (x + w * .04, y), (x + w * .36, y + h * .16)], fill=255)
    d.polygon([(x + w * .90, y + h * .26), (x + w * .96, y), (x + w * .64, y + h * .16)], fill=255)
    d.ellipse([x + w * .06, y + h * .18, x + w * .94, y + h * 1.00], fill=255)


def ange(d, s):
    """Ange : auréole, tête ronde, deux ailes déployées."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .34, y + h * .04, x + w * .66, y + h * .20],
              outline=255, width=int(w * .07))
    d.ellipse([x + w * .30, y + h * .22, x + w * .70, y + h * .68], fill=255)
    d.polygon([(x + w * .34, y + h * .34), (x + w * .02, y + h * .18),
               (x + w * .10, y + h * .52), (x + w * .02, y + h * .84),
               (x + w * .34, y + h * .62)], fill=255)
    d.polygon([(x + w * .66, y + h * .34), (x + w * .98, y + h * .18),
               (x + w * .90, y + h * .52), (x + w * .98, y + h * .84),
               (x + w * .66, y + h * .62)], fill=255)
    d.rounded_rectangle([x + w * .36, y + h * .62, x + w * .64, y + h * .98],
                        radius=int(w * .10), fill=255)
def engrenage(d, s):
    x, y, w, h = _box(s)
    cx, cy, r = x + w / 2, y + h / 2, w * 0.42
    for i in range(8):
        a = i * math.pi / 4
        d.line([(cx + math.cos(a) * r * 0.86, cy + math.sin(a) * r * 0.86),
                (cx + math.cos(a) * r * 1.16, cy + math.sin(a) * r * 1.16)],
               fill=255, width=int(w * .17))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)


def boulon(d, s):
    pts = [(0.5 + 0.48 * math.cos(a), 0.5 + 0.48 * math.sin(a))
           for a in [math.pi / 6 + i * math.pi / 3 for i in range(6)]]
    _poly(d, pts)


def ampoule(d, s):
    """Ampoule : bulbe rond, culot à vis strié, filament en accent."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .14, y + h * .02, x + w * .86, y + h * .70], fill=255)
    d.rounded_rectangle([x + w * .34, y + h * .62, x + w * .66, y + h * .84],
                        radius=int(w * .04), fill=255)
    for i in range(2):
        d.rectangle([x + w * .36, y + h * (.64 + i * .07), x + w * .64, y + h * (.68 + i * .07)], fill=0)
    d.rounded_rectangle([x + w * .42, y + h * .84, x + w * .58, y + h * .96],
                        radius=int(w * .04), fill=255)
def batterie(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .06, y + h * .26, x + w * .86, y + h * .86],
                        radius=int(w * .08), fill=255)
    d.rounded_rectangle([x + w * .86, y + h * .42, x + w * .98, y + h * .70],
                        radius=int(w * .04), fill=255)


def serveur(d, s):
    x, y, w, h = _box(s)
    for i in range(3):
        d.rounded_rectangle([x + w * .06, y + h * (.08 + i * .30), x + w * .94,
                             y + h * (.08 + i * .30 + .22)], radius=int(w * .05), fill=255)


def nuage(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .02, y + h * .36, x + w * .48, y + h * .82], fill=255)
    d.ellipse([x + w * .26, y + h * .18, x + w * .74, y + h * .74], fill=255)
    d.ellipse([x + w * .52, y + h * .34, x + w * .98, y + h * .82], fill=255)
    d.rectangle([x + w * .10, y + h * .56, x + w * .92, y + h * .82], fill=255)


def fusee_sys(d, s):
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .80, y + h * .44), (x + w * .20, y + h * .44)], fill=255)
    d.rectangle([x + w * .20, y + h * .40, x + w * .80, y + h * .78], fill=255)
    d.polygon([(x + w * .30, y + h * .78), (x + w * .50, y + h), (x + w * .70, y + h * .78)], fill=255)


def disquette(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x, y, x + w, y + h], radius=int(w * .06), fill=255)
    d.rectangle([x + w * .24, y, x + w * .76, y + h * .34], fill=0)
    d.rectangle([x + w * .24, y + h * .02, x + w * .76, y + h * .32], fill=255)
    d.rectangle([x + w * .14, y + h * .52, x + w * .86, y + h * .94], fill=0)
    d.rectangle([x + w * .16, y + h * .54, x + w * .84, y + h * .92], fill=255)


def wifi(d, s):
    x, y, w, h = _box(s)
    for i, r in enumerate((0.46, 0.32, 0.18)):
        d.arc([x + w * (.5 - r), y + h * (.5 - r + .10), x + w * (.5 + r),
               y + h * (.5 + r + .10)], 200, 340, fill=255, width=int(w * .11))
    d.ellipse([x + w * .42, y + h * .66, x + w * .58, y + h * .82], fill=255)


def etiquette_nouveau(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .06, y + h * .18, x + w * .94, y + h * .82],
                        radius=int(w * .30), fill=255)


def diamant_premium(d, s):
    _poly(d, [(0.50, 0.98), (0.06, 0.40), (0.26, 0.04), (0.74, 0.04), (0.94, 0.40)])


def couronne_premium(d, s):
    _poly(d, [(0.04, 0.86), (0.04, 0.24), (0.24, 0.58), (0.38, 0.08),
              (0.50, 0.48), (0.62, 0.08), (0.76, 0.58), (0.96, 0.24), (0.96, 0.86)])


def orbe_magique(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .10, y + h * .10, x + w * .90, y + h * .90], fill=255)


def potion(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .10, y + h * .42, x + w * .90, y + h * 1.00], fill=255)
    d.rectangle([x + w * .36, y + h * .06, x + w * .64, y + h * .50], fill=255)
    d.rectangle([x + w * .30, y, x + w * .70, y + h * .10], fill=255)


def boussole(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x, y, x + w, y + h], fill=255)
    d.polygon([(x + w * .50, y + h * .14), (x + w * .62, y + h * .50),
               (x + w * .50, y + h * .86), (x + w * .38, y + h * .50)], fill=0)


def parchemin_magique(d, s):
    """Grimoire ouvert : deux pages inclinées et un signe au centre."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y + h * .22), (x + w * .04, y + h * .10),
               (x + w * .04, y + h * .80), (x + w * .50, y + h * .94)], fill=255)
    d.polygon([(x + w * .50, y + h * .22), (x + w * .96, y + h * .10),
               (x + w * .96, y + h * .80), (x + w * .50, y + h * .94)], fill=255)
    d.rectangle([x + w * .47, y + h * .24, x + w * .53, y + h * .92], fill=0)
    for i in range(3):
        yy = y + h * (.30 + i * .17)
        d.line([(x + w * .12, yy), (x + w * .42, yy + h * .03)], fill=0, width=int(w * .03))
        d.line([(x + w * .58, yy + h * .03), (x + w * .88, yy)], fill=0, width=int(w * .03))
def livre(d, s):
    """Livre : couverture, dos à gauche, bloc de pages à droite, titre en haut."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .04, y + h * .04, x + w * .96, y + h * .96],
                        radius=int(w * .06), fill=255)
    d.rounded_rectangle([x + w * .04, y + h * .04, x + w * .18, y + h * .96],
                        radius=int(w * .04), fill=0)
    d.rounded_rectangle([x + w * .80, y + h * .12, x + w * .96, y + h * .88],
                        radius=int(w * .03), fill=0)
    d.rectangle([x + w * .30, y + h * .22, x + w * .70, y + h * .30], fill=0)
    d.rectangle([x + w * .30, y + h * .36, x + w * .58, y + h * .42], fill=0)
def ancre(d, s):
    """Ancre : anneau, tige, traverse, deux pattes recourbées."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .38, y, x + w * .62, y + h * .24], outline=255, width=int(w * .08))
    d.rectangle([x + w * .45, y + h * .20, x + w * .55, y + h * .86], fill=255)
    d.rounded_rectangle([x + w * .20, y + h * .34, x + w * .80, y + h * .44],
                        radius=int(w * .04), fill=255)
    d.arc([x + w * .06, y + h * .40, x + w * .94, y + h * 1.10], 20, 160,
          fill=255, width=int(w * .10))
    for cx, signe in ((.10, 1), (.90, -1)):
        d.polygon([(x + w * cx, y + h * .70), (x + w * (cx + .10 * signe), y + h * .58),
                   (x + w * (cx + .04 * signe), y + h * .86)], fill=255)
def sablier(d, s):
    x, y, w, h = _box(s)
    d.polygon([(x + w * .14, y), (x + w * .86, y), (x + w * .52, y + h * .50),
               (x + w * .86, y + h), (x + w * .14, y + h), (x + w * .48, y + h * .50)], fill=255)


def globe(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .06, y + h * .06, x + w * .94, y + h * .94], fill=255)
    d.rectangle([x + w * .06, y + h * .44, x + w * .94, y + h * .56], fill=0)
    d.ellipse([x + w * .30, y + h * .06, x + w * .70, y + h * .94], fill=0)
    d.ellipse([x + w * .36, y + h * .10, x + w * .64, y + h * .90], fill=255)


# ══════════════════════ FORMES AJOUTÉES (v2) ══════════════════════
def eclair(d, s):
    """Éclair : zigzag à deux crans, pointe effilée."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .62, y), (x + w * .18, y + h * .56),
               (x + w * .44, y + h * .56), (x + w * .30, y + h),
               (x + w * .84, y + h * .38), (x + w * .54, y + h * .38),
               (x + w * .78, y)], fill=255)

def flamme(d, s):
    """Flamme : goutte principale + langue secondaire (lecture immédiate)."""
    x, y, w, h = _box(s)
    # langue secondaire (droite, plus courte)
    d.ellipse([x + w * .60, y + h * .46, x + w * .94, y + h * .96], fill=255)
    d.polygon([(x + w * .80, y + h * .20), (x + w * .94, y + h * .66),
               (x + w * .64, y + h * .62)], fill=255)
    # goutte principale
    d.ellipse([x + w * .06, y + h * .50, x + w * .66, y + h * 1.0], fill=255)
    d.polygon([(x + w * .40, y), (x + w * .64, y + h * .62),
               (x + w * .16, y + h * .62)], fill=255)

def crane(d, s):
    """Crâne : boîte crânienne large + mâchoire + tempes."""
    x, y, w, h = _box(s)
    d.pieslice([x + w * .06, y, x + w * .94, y + h * .92], 180, 360, fill=255)
    d.rectangle([x + w * .06, y + h * .40, x + w * .94, y + h * .66], fill=255)
    d.rounded_rectangle([x + w * .24, y + h * .62, x + w * .76, y + h], radius=int(w * .10), fill=255)


def masque_theatre(d, s):
    """Masque de théâtre : ovales + sourcils + sourire théâtral."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .02, y + h * .04, x + w * .98, y + h * .96], fill=255)


def cotillon(d, s):
    """Cotillon de fête : cône + confettis (fête)."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .10, y + h * .92), (x + w * .34, y + h * .34),
               (x + w * .66, y + h * .66)], fill=255)
    for cx, cy, r in ((0.62, 0.16, .07), (0.86, 0.36, .055), (0.44, 0.10, .05),
                      (0.78, 0.10, .04)):
        d.ellipse([x + w * (cx - r), y + h * (cy - r), x + w * (cx + r), y + h * (cy + r)], fill=255)


def fusee_v2(d, s):
    """Fusée lisible : corps effilé + ailerons + hublot."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .68, y + h * .30), (x + w * .68, y + h * .74),
               (x + w * .32, y + h * .74), (x + w * .32, y + h * .30)], fill=255)
    d.polygon([(x + w * .32, y + h * .52), (x + w * .08, y + h * .84), (x + w * .32, y + h * .78)], fill=255)
    d.polygon([(x + w * .68, y + h * .52), (x + w * .92, y + h * .84), (x + w * .68, y + h * .78)], fill=255)
    d.polygon([(x + w * .40, y + h * .74), (x + w * .50, y + h), (x + w * .60, y + h * .74)], fill=255)


def manette_v2(d, s):
    """Manette : corps large + deux poignées bien marquées + croix + boutons."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .02, y + h * .28, x + w * .98, y + h * .66],
                        radius=int(w * .19), fill=255)
    d.ellipse([x - w * .02, y + h * .52, x + w * .34, y + h * .98], fill=255)
    d.ellipse([x + w * .66, y + h * .52, x + w * .98 + w * .02, y + h * .98], fill=255)


def joystick_v2(d, s):
    """Joystick : base + tige + boule, proportions nettes."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .10, y + h * .80, x + w * .90, y + h], radius=int(w * .08), fill=255)
    d.rectangle([x + w * .43, y + h * .32, x + w * .57, y + h * .84], fill=255)
    d.ellipse([x + w * .22, y, x + w * .78, y + h * .44], fill=255)


def epee_v2(d, s):
    """Épée large : lame, garde, poignée, pommeau."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .68, y + h * .22), (x + w * .68, y + h * .66),
               (x + w * .32, y + h * .66), (x + w * .32, y + h * .22)], fill=255)
    d.rounded_rectangle([x + w * .10, y + h * .66, x + w * .90, y + h * .80],
                        radius=int(w * .05), fill=255)
    d.rectangle([x + w * .42, y + h * .80, x + w * .58, y + h * .96], fill=255)
    d.ellipse([x + w * .36, y + h * .92, x + w * .64, y + h], fill=255)
