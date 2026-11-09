"""tools/emotes/shapes4.py — nouvelles silhouettes (1/3 : royal, tickets, économie).

Même convention que shapes.py : chaque fonction remplit un masque dans la
zone utile ; le moteur (engine.py) s'occupe de la peinture 3D.
"""
from .shapes import _b, _box, _poly


# ══════════════════════ ROYAL (nouveautés) ══════════════════════
def couronne_laurier(d, s):
    """Couronne de laurier : anneau de feuilles ouvert en haut."""
    import math
    x, y, w, h = _box(s)
    cx, cy = x + w * .50, y + h * .56
    rx, ry = w * .36, h * .38
    d.arc([cx - rx, cy - ry, cx + rx, cy + ry], 300, 240, fill=255, width=int(w * .13))
    for i in range(9):
        a = math.radians(-60 + i * 30)
        px = cx + math.cos(a) * rx * 1.22
        py = cy + math.sin(a) * ry * 1.22
        ex, ey = w * .10, h * .062
        d.ellipse([px - ex, py - ey, px + ex, py + ey], fill=255)
    for cote in (-1, 1):
        d.polygon([(cx + cote * w * .40, cy + h * .30), (cx + cote * w * .50, cy + h * .40),
                   (cx + cote * w * .40, cy + h * .50)], fill=255)
def anneau_bijou(d, s):
    """Bague : anneau épais + gemme ronde posée dessus."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .10, y + h * .30, x + w * .90, y + h * 1.02], fill=255)
    d.ellipse([x + w * .28, y + h * .46, x + w * .72, y + h * .88], fill=0)
    d.ellipse([x + w * .34, y + h * .02, x + w * .66, y + h * .34], fill=255)
    d.polygon([(x + w * .34, y + h * .18), (x + w * .50, y + h * .34),
               (x + w * .66, y + h * .18)], fill=255)


def gemme_marquise(d, s):
    """Gemme marquise : amande allongée, table centrale évidée."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .86, y + h * .30), (x + w * .86, y + h * .70),
               (x + w * .50, y + h), (x + w * .14, y + h * .70),
               (x + w * .14, y + h * .30)], fill=255)
    d.polygon([(x + w * .50, y + h * .22), (x + w * .68, y + h * .38),
               (x + w * .68, y + h * .62), (x + w * .50, y + h * .78),
               (x + w * .32, y + h * .62), (x + w * .32, y + h * .38)], fill=0)
    d.polygon([(x + w * .50, y + h * .32), (x + w * .60, y + h * .42),
               (x + w * .60, y + h * .58), (x + w * .50, y + h * .68),
               (x + w * .40, y + h * .58), (x + w * .40, y + h * .42)], fill=255)
def orbe_croix(d, s):
    """Orbe royal : sphère + croix au sommet + socle."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .12, y + h * .34, x + w * .88, y + h * 1.00], fill=255)
    d.rectangle([x + w * .44, y + h * .02, x + w * .56, y + h * .40], fill=255)
    d.rectangle([x + w * .28, y + h * .10, x + w * .72, y + h * .22], fill=255)
    d.rectangle([x + w * .30, y + h * .94, x + w * .70, y + h * 1.02], fill=255)


# ══════════════════════ TICKETS (nouveautés) ══════════════════════
def calendrier(d, s):
    """Calendrier : deux anneaux qui dépassent, bandeau, grille de 6 jours."""
    x, y, w, h = _box(s)
    for cx in (0.28, 0.72):
        d.rounded_rectangle([x + w * (cx - .055), y, x + w * (cx + .055), y + h * .26],
                            radius=int(w * .04), fill=255)
    d.rounded_rectangle([x + w * .04, y + h * .16, x + w * .96, y + h * 1.0],
                        radius=int(w * .10), fill=255)
    d.rectangle([x + w * .04, y + h * .40, x + w * .96, y + h * .45], fill=0)
    for ligne in range(2):
        for col in range(3):
            cx = x + w * (.16 + col * .26)
            cy = y + h * (.56 + ligne * .20)
            d.rounded_rectangle([cx, cy, cx + w * .18, cy + h * .12],
                                radius=int(w * .03), fill=0)
def formulaire(d, s):
    """Formulaire : page + cases à cocher à gauche."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .08, y, x + w * .92, y + h], radius=int(w * .06), fill=255)
    for i in range(4):
        cy = y + h * (.18 + i * .20)
        d.rectangle([x + w * .18, cy, x + w * .30, cy + h * .10], fill=0)
        d.rectangle([x + w * .38, cy, x + w * .82, cy + h * .10], fill=0)


def corbeille(d, s):
    """Corbeille : couvercle débordant, corps évasé, rainures verticales."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .06, y + h * .16, x + w * .94, y + h * .30],
                        radius=int(w * .05), fill=255)
    d.rounded_rectangle([x + w * .38, y + h * .04, x + w * .62, y + h * .18],
                        radius=int(w * .04), fill=255)
    d.polygon([(x + w * .18, y + h * .32), (x + w * .82, y + h * .32),
               (x + w * .74, y + h * 1.0), (x + w * .26, y + h * 1.0)], fill=255)
    for cx in (.38, .50, .62):
        d.polygon([(x + w * (cx - .02), y + h * .42), (x + w * (cx + .02), y + h * .42),
                   (x + w * (cx + .015), y + h * .90), (x + w * (cx - .015), y + h * .90)], fill=0)
def epingle(d, s):
    """Punaise : tête large, col court, pointe fine."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .20, y + h * .06, x + w * .80, y + h * .54], fill=255)
    d.rectangle([x + w * .42, y + h * .50, x + w * .58, y + h * .70], fill=255)
    d.polygon([(x + w * .43, y + h * .66), (x + w * .57, y + h * .66),
               (x + w * .50, y + h * 1.0)], fill=255)
def signet(d, s):
    """Signet : bande avec encoche en V en bas."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .24, y), (x + w * .76, y), (x + w * .76, y + h),
               (x + w * .50, y + h * .72), (x + w * .24, y + h)], fill=255)


def drapeau(d, s):
    """Drapeau : hampe + étoffe qui flotte."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .16, y, x + w * .27, y + h], radius=int(w * .05), fill=255)
    d.polygon([(x + w * .27, y + h * .04), (x + w * .92, y + h * .14),
               (x + w * .74, y + h * .36), (x + w * .92, y + h * .58),
               (x + w * .27, y + h * .50)], fill=255)


def horloge(d, s):
    """Cadran d'horloge : anneau, quatre repères, couronne (sans aiguilles)."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .06, y + h * .12, x + w * .94, y + h * 1.0], fill=255)
    d.ellipse([x + w * .20, y + h * .26, x + w * .80, y + h * .86], fill=0)
    for cx, cy, ex, ey in ((.50, .16, .06, .035), (.50, .96, .06, .035),
                           (.12, .56, .035, .06), (.88, .56, .035, .06)):
        d.ellipse([x + w * (cx - ex), y + h * (cy - ey), x + w * (cx + ex), y + h * (cy + ey)],
                  fill=255)
    d.rounded_rectangle([x + w * .40, y - h * .02, x + w * .60, y + h * .14],
                        radius=int(w * .04), fill=255)


def triangle_attention(d, s):
    """Panneau triangulaire d'alerte avec point d'exclamation évidé."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y - h * .02), (x + w * 1.0, y + h * .96),
               (x, y + h * .96)], fill=255)
    d.rounded_rectangle([x + w * .45, y + h * .34, x + w * .55, y + h * .74],
                        radius=int(w * .05), fill=0)
    d.ellipse([x + w * .44, y + h * .78, x + w * .56, y + h * .90], fill=0)


# ══════════════════════ ÉCONOMIE (nouveautés) ══════════════════════
def tirelire(d, s):
    """Tirelire : corps rond, oreille, pattes, bout de museau, fente."""
    x, y, w, h = _box(s)
    d.ellipse([x, y + h * .16, x + w * .92, y + h * .88], fill=255)
    d.polygon([(x + w * .22, y + h * .22), (x + w * .38, y), (x + w * .46, y + h * .24)], fill=255)
    for cx in (0.20, 0.66):
        d.rectangle([x + w * cx, y + h * .74, x + w * (cx + .13), y + h * .98], fill=255)
    d.ellipse([x + w * .78, y + h * .40, x + w * 1.0, y + h * .66], fill=255)
    d.rounded_rectangle([x + w * .30, y + h * .18, x + w * .62, y + h * .27],
                        radius=int(w * .03), fill=0)


def jeton(d, s):
    """Jeton de casino : disque à crans plats, anneau intérieur epais."""
    import math
    x, y, w, h = _box(s)
    cx, cy, r = x + w * .5, y + h * .5, w * .5
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    for i in range(8):
        a = i * math.pi / 4
        d.line([(cx + math.cos(a) * r * .92, cy + math.sin(a) * r * .92),
                (cx + math.cos(a) * r * 1.06, cy + math.sin(a) * r * 1.06)],
               fill=0, width=int(w * .11))
    d.ellipse([cx - r * .58, cy - r * .58, cx + r * .58, cy + r * .58], fill=0)
    d.ellipse([cx - r * .22, cy - r * .22, cx + r * .22, cy + r * .22], fill=255)
def panier(d, s):
    """Panier de courses : corps évasé, poignée, croisillons."""
    x, y, w, h = _box(s)
    d.arc([x + w * .26, y - h * .06, x + w * .74, y + h * .44], 180, 360,
          fill=255, width=int(w * .10))
    d.polygon([(x + w * .04, y + h * .34), (x + w * .96, y + h * .34),
               (x + w * .84, y + h * 1.0), (x + w * .16, y + h * 1.0)], fill=255)
    for i in range(3):
        cx = x + w * (.30 + i * .20)
        d.line([(cx, y + h * .42), (cx - w * .03, y + h * .92)], fill=0, width=int(w * .05))


def porte_monnaie(d, s):
    """Portefeuille : carte qui dépasse, rabat, bouton pression."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .30, y, x + w * .98, y + h * .44],
                        radius=int(w * .05), fill=255)
    d.rounded_rectangle([x, y + h * .18, x + w * .92, y + h * 1.0],
                        radius=int(w * .12), fill=255)
    d.rounded_rectangle([x + w * .06, y + h * .26, x + w * .86, y + h * .54],
                        radius=int(w * .07), fill=0)
    d.rounded_rectangle([x + w * .06, y + h * .26, x + w * .86, y + h * .54],
                        radius=int(w * .07), fill=255)
    d.ellipse([x + w * .42, y + h * .66, x + w * .52, y + h * .76], fill=0)
def balance(d, s):
    """Balance à plateaux : colonne, fléau, deux plateaux."""
    x, y, w, h = _box(s)
    d.rectangle([x + w * .46, y + h * .18, x + w * .54, y + h * .92], fill=255)
    d.rectangle([x + w * .12, y + h * .18, x + w * .88, y + h * .27], fill=255)
    d.rounded_rectangle([x + w * .18, y + h * .92, x + w * .82, y + h * 1.0],
                        radius=int(w * .04), fill=255)
    for cx in (0.14, 0.86):
        d.arc([x + w * (cx - .13), y + h * .34, x + w * (cx + .13), y + h * .64],
              0, 180, fill=255, width=int(w * .07))
        d.rectangle([x + w * (cx - .13), y + h * .46, x + w * (cx + .13), y + h * .50], fill=255)


def pourcentage(d, s):
    """Étiquette de réduction : deux pastilles et une barre oblique."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .06, y + h * .06, x + w * .44, y + h * .44], fill=255)
    d.ellipse([x + w * .56, y + h * .58, x + w * .94, y + h * .96], fill=255)
    d.line([(x + w * .22, y + h * .88), (x + w * .80, y + h * .10)], fill=255, width=int(w * .15))
    d.ellipse([x + w * .17, y + h * .17, x + w * .33, y + h * .33], fill=0)
    d.ellipse([x + w * .67, y + h * .69, x + w * .83, y + h * .85], fill=0)


def graphique_baisse(d, s):
    """Courbe qui descend + barres décroissantes."""
    x, y, w, h = _box(s)
    hauteurs = (.86, .62, .40, .20)
    for i, hh in enumerate(hauteurs):
        cx = x + w * (.10 + i * .22)
        d.rounded_rectangle([cx, y + h * (1 - hh), cx + w * .16, y + h],
                            radius=int(w * .04), fill=255)
    d.line([(x + w * .14, y + h * .14), (x + w * .86, y + h * .66)], fill=255, width=int(w * .08))
    d.polygon([(x + w * .86, y + h * .52), (x + w * 1.0, y + h * .74),
               (x + w * .74, y + h * .74)], fill=255)
