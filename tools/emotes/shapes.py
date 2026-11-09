"""tools/emotes/shapes.py — silhouettes (partie 1 : royal, gemmes, protection).

Chaque fonction dessine une forme pleine dans un canevas de côté `s`
et renvoie un masque. Le moteur s'occupe de la peinture 3D.
Coordonnées relatives 0..1 dans la zone utile.
"""
from PIL import Image, ImageDraw
import math


def _b(s, marge=0.07):
    p = s * marge
    return p, p, s - p, s - p


def _poly(d, points, s=None, marge=0.07):
    if s is None:
        s = getattr(d, '_image', None).size[0] if getattr(d, '_image', None) else 512
    x0, y0, x1, y1 = _b(s, marge)
    w, h = x1 - x0, y1 - y0
    d.polygon([(x0 + px * w, y0 + py * h) for px, py in points], fill=255)


def _box(s, marge=0.07):
    x0, y0, x1, y1 = _b(s, marge)
    return x0, y0, x1 - x0, y1 - y0  # x, y, largeur, hauteur


# ══════════════════════ ROYAL ══════════════════════
def couronne(d, s):
    """Couronne : base pleine, 5 pointes, perles au sommet."""
    x, y, w, h = _box(s)
    _poly(d, [(0.02, 0.80), (0.02, 0.30), (0.24, 0.58), (0.38, 0.10),
              (0.50, 0.52), (0.62, 0.10), (0.76, 0.58), (0.98, 0.30),
              (0.98, 0.80)])
    d.rectangle([x, y + h * 0.72, x + w, y + h], fill=255)
    for cx, cy, r in ((0.02, 0.26, 0.075), (0.38, 0.06, 0.075), (0.62, 0.06, 0.075),
                      (0.98, 0.26, 0.075)):
        d.ellipse([x + w * (cx - r), y + h * (cy - r), x + w * (cx + r), y + h * (cy + r)], fill=255)


def couronne_ronde(d, s):
    x, y, w, h = _box(s)
    d.pieslice([x, y + h * 0.34, x + w, y + h * 1.30], 180, 360, fill=255)
    for cx, sommet in ((0.16, 0.12), (0.50, 0.00), (0.84, 0.12)):
        d.polygon([(x + w * (cx - 0.13), y + h * 0.70),
                   (x + w * cx, y + h * sommet),
                   (x + w * (cx + 0.13), y + h * 0.70)], fill=255)
    d.rectangle([x + w * 0.04, y + h * 0.64, x + w * 0.96, y + h], fill=255)


def diademe(d, s):
    _poly(d, [(0.06, 0.96), (0.06, 0.50), (0.30, 0.78), (0.50, 0.06),
              (0.70, 0.78), (0.94, 0.50), (0.94, 0.96)])


def medaille_or(d, s):
    return medaille(d, s)


def trone(d, s):
    """Trône : dossier haut, accoudoirs, assise, pieds."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .22, y, x + w * .78, y + h * .66], radius=int(w * .20), fill=255)
    d.rectangle([x + w * .22, y + h * .48, x + w * .78, y + h * .68], fill=255)
    d.rounded_rectangle([x + w * .06, y + h * .52, x + w * .24, y + h * .70], radius=int(w * .06), fill=255)
    d.rounded_rectangle([x + w * .76, y + h * .52, x + w * .94, y + h * .70], radius=int(w * .06), fill=255)
    d.rectangle([x + w * .12, y + h * .66, x + w * .88, y + h * .84], fill=255)
    d.rectangle([x + w * .16, y + h * .84, x + w * .30, y + h], fill=255)
    d.rectangle([x + w * .70, y + h * .84, x + w * .84, y + h], fill=255)


def sceptre(d, s):
    """Sceptre : hampe + orbe + pointe sommitale."""
    x, y, w, h = _box(s)
    d.line([(x + w * .26, y + h), (x + w * .50, y + h * .48)], fill=255, width=int(w * .14))
    d.ellipse([x + w * .36, y + h * .20, x + w * .86, y + h * .70], fill=255)
    d.polygon([(x + w * .61, y + h * .22), (x + w * .61, y + h * .00),
               (x + w * .74, y + h * .16)], fill=255)
    d.ellipse([x + w * .34, y + h * .80, x + w * .50, y + h * .96], fill=255)


def calice(d, s):
    """Calice : coupe évasée + pied."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .04, y + h * .06), (x + w * .96, y + h * .06),
               (x + w * .62, y + h * .70), (x + w * .38, y + h * .70)], fill=255)
    d.rectangle([x + w * .40, y + h * .64, x + w * .60, y + h * .86], fill=255)
    d.ellipse([x + w * .18, y + h * .80, x + w * .82, y + h * .98], fill=255)


# ══════════════════════ GEMMES ══════════════════════
def diamant(d, s):
    _poly(d, [(0.50, 0.98), (0.04, 0.36), (0.22, 0.04), (0.78, 0.04), (0.96, 0.36)])


def diamant_brillant(d, s):
    _poly(d, [(0.50, 0.99), (0.13, 0.34), (0.30, 0.03), (0.70, 0.03),
              (0.87, 0.34)])


def gemme_ovale(d, s):
    """Gemme taillée : table claire au centre, facettes autour, pointe en bas."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y + h * .00), (x + w * .84, y + h * .26),
               (x + w * .84, y + h * .56), (x + w * .50, y + h * 1.00),
               (x + w * .16, y + h * .56), (x + w * .16, y + h * .26)], fill=255)
    # table (facette centrale) évidée : lecture immédiate d'une pierre taillée
    d.polygon([(x + w * .50, y + h * .16), (x + w * .70, y + h * .32),
               (x + w * .70, y + h * .50), (x + w * .50, y + h * .70),
               (x + w * .30, y + h * .50), (x + w * .30, y + h * .32)], fill=0)
    d.polygon([(x + w * .50, y + h * .22), (x + w * .62, y + h * .34),
               (x + w * .62, y + h * .48), (x + w * .50, y + h * .60),
               (x + w * .38, y + h * .48), (x + w * .38, y + h * .34)], fill=255)
def gemme_table(d, s):
    """Gemme à table plate (couronne + culasse)."""
    _poly(d, [(0.30, 0.02), (0.70, 0.02), (0.96, 0.30), (0.96, 0.62),
              (0.50, 0.99), (0.04, 0.62), (0.04, 0.30)])


def cristal(d, s):
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .80, y + h * .30), (x + w * .70, y + h * .92),
               (x + w * .30, y + h * .92), (x + w * .20, y + h * .30)], fill=255)


def gemme_emeraude(d, s):
    """Émeraude : rectangle à coins coupés (taille émeraude)."""
    _poly(d, [(0.22, 0.04), (0.78, 0.04), (0.96, 0.26), (0.96, 0.74),
              (0.78, 0.96), (0.22, 0.96), (0.04, 0.74), (0.04, 0.26)])


def amas_gemmes(d, s):
    """Trois gemmes dressées, la plus grande au centre."""
    _poly(d, [(0.50, 0.00), (0.70, 0.24), (0.63, 0.62), (0.37, 0.62), (0.30, 0.24)])
    _poly(d, [(0.14, 0.30), (0.28, 0.44), (0.24, 0.78), (0.04, 0.78), (0.00, 0.44)])
    _poly(d, [(0.86, 0.30), (1.00, 0.44), (0.96, 0.78), (0.76, 0.78), (0.72, 0.44)])
def lingot(d, s):
    _poly(d, [(0.12, 0.98), (0.02, 0.62), (0.34, 0.34), (0.98, 0.34),
              (0.88, 0.98)])


def gemme_coeur(d, s):
    x, y, w, h = _box(s)
    d.pieslice([x, y + h * .02, x + w * .55, y + h * .62], 180, 360, fill=255)
    d.pieslice([x + w * .45, y + h * .02, x + w, y + h * .62], 180, 360, fill=255)
    d.polygon([(x, y + h * .42), (x + w * .5, y + h), (x + w, y + h * .42)], fill=255)


def orbe(d, s):
    """Orbe : sphère pleine (le relief vient de la peinture 3D)."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .04, y + h * .04, x + w * .96, y + h * .96], fill=255)
def bouclier(d, s):
    _poly(d, [(0.50, 0.01), (0.97, 0.23), (0.90, 0.62), (0.50, 0.99),
              (0.10, 0.62), (0.03, 0.23)])


def bouclier_rond(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x, y, x + w, y + h], fill=255)


def cadenas(d, s):
    x, y, w, h = _box(s)
    d.arc([x + w * .24, y + h * .02, x + w * .76, y + h * .64], 180, 360,
          fill=255, width=int(w * .14))
    d.rounded_rectangle([x + w * .10, y + h * .42, x + w * .90, y + h],
                        radius=int(w * .13), fill=255)


def cle(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .02, y + h * .04, x + w * .58, y + h * .60], fill=255)
    d.ellipse([x + w * .20, y + h * .22, x + w * .40, y + h * .42], fill=0)
    d.line([(x + w * .48, y + h * .52), (x + w * .96, y + h)], fill=255, width=int(w * .17))
    d.line([(x + w * .74, y + h * .78), (x + w * .90, y + h * .62)], fill=255, width=int(w * .13))


def antivirus(d, s):
    _poly(d, [(0.50, 0.01), (0.97, 0.23), (0.90, 0.62), (0.50, 0.99),
              (0.10, 0.62), (0.03, 0.23)])
    x, y, w, h = _box(s)
    d.line([(x + w * .30, y + h * .48), (x + w * .45, y + h * .64),
            (x + w * .73, y + h * .30)], fill=0, width=int(w * .12))


def menottes(d, s):
    """Menottes : deux anneaux ouverts reliés par une chaîne à trois maillons."""
    x, y, w, h = _box(s)
    for cx in (.20, .80):
        d.ellipse([x + w * (cx - .20), y + h * .10, x + w * (cx + .20), y + h * .50],
                  outline=255, width=int(w * .085))
        d.ellipse([x + w * (cx - .10), y + h * .50, x + w * (cx + .10), y + h * .70], fill=255)
    for i in range(3):
        cx = .50 + (i - 1) * .13
        d.ellipse([x + w * (cx - .07), y + h * .54, x + w * (cx + .07), y + h * .68],
                  outline=255, width=int(w * .05))
def oeil(d, s):
    """Œil : amande, iris, pupille claire, deux cils."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .02, y + h * .50), (x + w * .34, y + h * .16),
               (x + w * .68, y + h * .16), (x + w * .98, y + h * .50),
               (x + w * .68, y + h * .84), (x + w * .34, y + h * .84)], fill=255)
    d.ellipse([x + w * .30, y + h * .26, x + w * .70, y + h * .74], fill=0)
    d.ellipse([x + w * .40, y + h * .36, x + w * .60, y + h * .64], fill=255)
    d.ellipse([x + w * .45, y + h * .42, x + w * .55, y + h * .52], fill=0)
def mur(d, s):
    x, y, w, h = _box(s)
    d.rectangle([x, y + h * .10, x + w, y + h], fill=255)
    for i, yy in enumerate((0.10, 0.40, 0.70)):
        d.line([(x, y + h * yy), (x + w, y + h * yy)], fill=0, width=int(w * .05))
        for j in range(3):
            cx = x + w * (0.17 + j * 0.33 + (0.17 if i % 2 else 0))
            d.line([(cx, y + h * yy), (cx, y + h * (yy + 0.30))], fill=0, width=int(w * .05))


def radar(d, s):
    x, y, w, h = _box(s)
    d.pieslice([x, y + h * .10, x + w, y + h * 1.10], 180, 360, fill=255)
    d.pieslice([x + w * .18, y + h * .30, x + w * .82, y + h * .94], 180, 360, fill=0)
    d.arc([x + w * .32, y + h * .42, x + w * .68, y + h * .78], 0, 360, fill=255, width=int(w * .05))
