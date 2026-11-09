"""tools/emotes/shapes2.py — silhouettes (partie 2 : tickets, éco, gaming,
communauté, animaux, fun, système, premium)."""
from PIL import Image, ImageDraw
import math
from .shapes import _b, _box, _poly


# ══════════════════════ TICKETS / DOCS ══════════════════════
def billet_ticket(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x, y + h * .24, x + w, y + h * .76], radius=int(w * .12), fill=255)
    d.ellipse([x - w * .12, y + h * .38, x + w * .12, y + h * .62], fill=0)
    d.ellipse([x + w * .88, y + h * .38, x + w * 1.12, y + h * .62], fill=0)


def ticket_coche(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x, y + h * .20, x + w, y + h * .80], radius=int(w * .12), fill=255)


def enveloppe(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x, y + h * .18, x + w, y + h * .82], radius=int(w * .08), fill=255)


def parchemin(d, s):
    """Parchemin roulé en haut et en bas."""
    x, y, w, h = _box(s)
    d.rectangle([x + w * .14, y + h * .16, x + w * .86, y + h * .84], fill=255)
    d.rounded_rectangle([x + w * .06, y + h * .02, x + w * .94, y + h * .22],
                        radius=int(w * .09), fill=255)
    d.rounded_rectangle([x + w * .06, y + h * .78, x + w * .94, y + h * .98],
                        radius=int(w * .09), fill=255)
    for i in range(3):
        d.rectangle([x + w * .26, y + h * (.34 + i * .16), x + w * .74, y + h * (.38 + i * .16)],
                    fill=0)
def marque_page(d, s):
    _poly(d, [(0.18, 0.02), (0.82, 0.02), (0.82, 0.98), (0.50, 0.70), (0.18, 0.98)])


def dossier(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x, y + h * .24, x + w, y + h * .98], radius=int(w * .10), fill=255)
    d.rounded_rectangle([x + w * .06, y + h * .02, x + w * .56, y + h * .34],
                        radius=int(w * .08), fill=255)


def loupe(d, s):
    """Loupe : anneau épais en haut à gauche, manche épais en bas à droite."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .02, y + h * .02, x + w * .70, y + h * .70],
              outline=255, width=int(w * .13))
    d.line([(x + w * .62, y + h * .62), (x + w * .96, y + h * .96)],
           fill=255, width=int(w * .13))
    d.ellipse([x + w * .12, y + h * .12, x + w * .30, y + h * .30], fill=255)
def document(d, s):
    x, y, w, h = _box(s)
    d.polygon([(x + w * .12, y), (x + w * .70, y), (x + w * .92, y + h * .26),
               (x + w * .92, y + h), (x + w * .12, y + h)], fill=255)


def boite_archive(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x, y + h * .18, x + w, y + h * .98], radius=int(w * .08), fill=255)
    d.rectangle([x - w * .02, y + h * .02, x + w * 1.02, y + h * .26], fill=255)


# ══════════════════════ ÉCONOMIE ══════════════════════
def piece(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .02, y + h * .02, x + w * .98, y + h * .98], fill=255)


def billets(d, s):
    """Billet de banque : cadre, médaillon central, coin de valeur."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .10, y + h * .02, x + w * .80, y + h * .44],
                        radius=int(w * .04), fill=255)
    d.rounded_rectangle([x, y + h * .22, x + w * .92, y + h * .80],
                        radius=int(w * .05), fill=255)
    # cadre intérieur
    d.rounded_rectangle([x + w * .06, y + h * .29, x + w * .86, y + h * .73],
                        radius=int(w * .03), outline=255, width=int(w * .045))
    # médaillon
    d.ellipse([x + w * .32, y + h * .38, x + w * .56, y + h * .64], fill=0)
    d.ellipse([x + w * .37, y + h * .43, x + w * .51, y + h * .59], fill=255)
def sac_argent(d, s):
    """Sac d'argent : panse large, col serré, cordon avec deux bouts."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .14, y + h * .36), (x + w * .86, y + h * .36),
               (x + w * .96, y + h * .80), (x + w * .70, y + h * 1.0),
               (x + w * .30, y + h * 1.0), (x + w * .04, y + h * .80)], fill=255)
    d.polygon([(x + w * .30, y + h * .02), (x + w * .70, y + h * .02),
               (x + w * .62, y + h * .40), (x + w * .38, y + h * .40)], fill=255)
    d.rounded_rectangle([x + w * .24, y + h * .32, x + w * .76, y + h * .46],
                        radius=int(w * .06), fill=0)
    d.line([(x + w * .24, y + h * .39), (x + w * .10, y + h * .56)], fill=255, width=int(w * .05))
    d.line([(x + w * .76, y + h * .39), (x + w * .90, y + h * .56)], fill=255, width=int(w * .05))
    d.ellipse([x + w * .38, y + h * .56, x + w * .62, y + h * .80], fill=0)
    d.ellipse([x + w * .45, y + h * .63, x + w * .55, y + h * .73], fill=255)
def carte_bancaire(d, s):
    """Carte bancaire : bande magnétique, puce dorée, deux lignes de chiffres."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .02, y + h * .24, x + w * .98, y + h * .78],
                        radius=int(w * .08), fill=255)
    d.rectangle([x + w * .02, y + h * .34, x + w * .98, y + h * .46], fill=0)
    d.rounded_rectangle([x + w * .12, y + h * .52, x + w * .30, y + h * .66],
                        radius=int(w * .03), fill=0)
    for i in range(3):
        d.rectangle([x + w * (.40 + i * .18), y + h * .56, x + w * (.52 + i * .18), y + h * .62], fill=0)
def coffre(d, s):
    """Coffre au trésor : couvercle bombé, corps, serrure centrale."""
    x, y, w, h = _box(s)
    d.pieslice([x + w * .06, y + h * .10, x + w * .94, y + h * .78], 180, 360, fill=255)
    d.rounded_rectangle([x + w * .06, y + h * .44, x + w * .94, y + h * 1.0],
                        radius=int(w * .06), fill=255)
    d.rectangle([x + w * .06, y + h * .40, x + w * .94, y + h * .46], fill=0)
    d.rounded_rectangle([x + w * .40, y + h * .46, x + w * .60, y + h * .74],
                        radius=int(w * .03), fill=0)
    d.ellipse([x + w * .46, y + h * .50, x + w * .54, y + h * .58], fill=255)
    for cx in (.16, .84):
        d.rectangle([x + w * (cx - .025), y + h * .24, x + w * (cx + .025), y + h * .98], fill=0)
def lingot_or(d, s):
    _poly(d, [(0.10, 0.96), (0.00, 0.56), (0.30, 0.26), (0.98, 0.26), (0.88, 0.96)])
    _poly(d, [(0.16, 0.86), (0.10, 0.58), (0.36, 0.36), (0.86, 0.36), (0.80, 0.86)])


def etiquette_prix(d, s):
    """Étiquette de prix : pans coupés, trou de ficelle, deux traits."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .30, y + h * .06), (x + w * .96, y + h * .06),
               (x + w * .96, y + h * .94), (x + w * .30, y + h * .94),
               (x + w * .04, y + h * .50)], fill=255)
    d.ellipse([x + w * .16, y + h * .42, x + w * .30, y + h * .58], fill=0)
    d.rectangle([x + w * .42, y + h * .32, x + w * .84, y + h * .42], fill=0)
    d.rectangle([x + w * .42, y + h * .56, x + w * .84, y + h * .66], fill=0)
def graphique_hausse(d, s):
    x, y, w, h = _box(s)
    d.polygon([(x, y + h), (x + w * .28, y + h * .58), (x + w * .52, y + h * .74),
               (x + w * .78, y + h * .22), (x + w, y + h * .34), (x + w, y + h),
               (x, y + h)], fill=255)


def diamant_argent(d, s):
    _poly(d, [(0.50, 0.96), (0.10, 0.44), (0.32, 0.06), (0.68, 0.06), (0.90, 0.44)])


def gemme_verte(d, s):
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .95, y + h * .34), (x + w * .78, y + h * .96),
               (x + w * .22, y + h * .96), (x + w * .05, y + h * .34)], fill=255)


# ══════════════════════ GAMING ══════════════════════
def manette(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x, y + h * .26, x + w, y + h * .74], radius=int(w * .24), fill=255)
    d.ellipse([x + w * .02, y + h * .52, x + w * .30, y + h * .96], fill=255)
    d.ellipse([x + w * .70, y + h * .52, x + w * .98, y + h * .96], fill=255)


def epee(d, s):
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .64, y + h * .20), (x + w * .64, y + h * .70),
               (x + w * .36, y + h * .70), (x + w * .36, y + h * .20)], fill=255)
    d.rectangle([x + w * .16, y + h * .70, x + w * .84, y + h * .80], fill=255)
    d.rectangle([x + w * .44, y + h * .80, x + w * .56, y + h], fill=255)


def joystick(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x, y + h * .66, x + w, y + h * .96], fill=255)
    d.line([(x + w * .50, y + h * .80), (x + w * .50, y + h * .28)], fill=255, width=int(w * .14))
    d.ellipse([x + w * .26, y, x + w * .74, y + h * .40], fill=255)


def de(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .04, y + h * .04, x + w * .96, y + h * .96],
                        radius=int(w * .20), fill=255)


def trophée(d, s):
    x, y, w, h = _box(s)
    d.pieslice([x + w * .14, y, x + w * .86, y + h * .72], 0, 180, fill=255)
    d.rectangle([x + w * .14, y, x + w * .86, y + h * .22], fill=255)
    d.rectangle([x + w * .44, y + h * .58, x + w * .56, y + h * .82], fill=255)
    d.rectangle([x + w * .26, y + h * .80, x + w * .74, y + h], fill=255)
    d.arc([x - w * .10, y + h * .08, x + w * .26, y + h * .44], 90, 270, fill=255, width=int(w * .09))
    d.arc([x + w * .74, y + h * .08, x + w * 1.10, y + h * .44], 270, 90, fill=255, width=int(w * .09))


def medaille(d, s):
    """Médaille : ruban en V en haut, disque rond en bas."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .22, y), (x + w * .44, y), (x + w * .50, y + h * .44),
               (x + w * .34, y + h * .44)], fill=255)
    d.polygon([(x + w * .78, y), (x + w * .56, y), (x + w * .50, y + h * .44),
               (x + w * .66, y + h * .44)], fill=255)
    d.ellipse([x + w * .20, y + h * .40, x + w * .80, y + h * 1.0], fill=255)
    d.ellipse([x + w * .30, y + h * .50, x + w * .70, y + h * .90], fill=0)
    d.ellipse([x + w * .37, y + h * .57, x + w * .63, y + h * .83], fill=255)
def casque(d, s):
    """Casque audio : arceau, deux oreillettes, micro."""
    x, y, w, h = _box(s)
    d.arc([x + w * .10, y + h * .06, x + w * .90, y + h * .90], 180, 360,
          fill=255, width=int(w * .13))
    for cx in (.10, .90):
        d.rounded_rectangle([x + w * (cx - .10), y + h * .38, x + w * (cx + .10), y + h * .84],
                            radius=int(w * .08), fill=255)
    d.line([(x + w * .20, y + h * .80), (x + w * .34, y + h * .96)], fill=255, width=int(w * .07))
    d.ellipse([x + w * .28, y + h * .88, x + w * .42, y + h * 1.0], fill=255)
def bombe(d, s):
    """Bombe : sphère, col trapu, mèche courbe épaisse, étincelle."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .08, y + h * .32, x + w * .84, y + h * 1.0], fill=255)
    d.polygon([(x + w * .36, y + h * .34), (x + w * .56, y + h * .34),
               (x + w * .60, y + h * .16), (x + w * .40, y + h * .16)], fill=255)
    d.rounded_rectangle([x + w * .32, y + h * .10, x + w * .66, y + h * .20],
                        radius=int(w * .04), fill=255)
    d.line([(x + w * .64, y + h * .14), (x + w * .78, y + h * .06),
            (x + w * .90, y + h * .12)], fill=255, width=int(w * .06), joint='curve')
    for dx, dy, r in ((.92, .04, .045), (.98, .14, .033), (.86, .18, .028)):
        d.ellipse([x + w * dx - w * r, y + h * dy - w * r,
                   x + w * dx + w * r, y + h * dy + w * r], fill=255)
def fusee(d, s):
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .76, y + h * .34), (x + w * .76, y + h * .72),
               (x + w * .24, y + h * .72), (x + w * .24, y + h * .34)], fill=255)
    d.polygon([(x + w * .24, y + h * .48), (x + w * .02, y + h * .82), (x + w * .24, y + h * .76)], fill=255)
    d.polygon([(x + w * .76, y + h * .48), (x + w * .98, y + h * .82), (x + w * .76, y + h * .76)], fill=255)


def niveau(d, s):
    """Flèche vers le haut : grand chevron et hampe épaisse."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .98, y + h * .42),
               (x + w * .72, y + h * .42), (x + w * .72, y + h * 1.0),
               (x + w * .28, y + h * 1.0), (x + w * .28, y + h * .42),
               (x + w * .02, y + h * .42)], fill=255)
def bulle(d, s):
    """Bulle de dialogue : queue à gauche et trois points (réponse, message)."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x, y + h * .04, x + w, y + h * .70], radius=int(w * .20), fill=255)
    d.polygon([(x + w * .28, y + h * .64), (x + w * .26, y + h * .98),
               (x + w * .58, y + h * .68)], fill=255)
    for i in range(3):
        cx = x + w * (.28 + i * .22)
        d.ellipse([cx - w * .055, y + h * .28, cx + w * .055, y + h * .44], fill=0)


def coeur(d, s):
    x, y, w, h = _box(s)
    d.pieslice([x, y + h * .04, x + w * .56, y + h * .64], 180, 360, fill=255)
    d.pieslice([x + w * .44, y + h * .04, x + w, y + h * .64], 180, 360, fill=255)
    d.polygon([(x, y + h * .44), (x + w * .5, y + h), (x + w, y + h * .44)], fill=255)


def etoile(d, s):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = 0.5 if i % 2 == 0 else 0.21
        pts.append((0.5 + r * math.cos(a), 0.5 + r * math.sin(a)))
    _poly(d, pts)


def etoile_4(d, s):
    _poly(d, [(0.50, 0.00), (0.60, 0.40), (1.00, 0.50), (0.60, 0.60),
              (0.50, 1.00), (0.40, 0.60), (0.00, 0.50), (0.40, 0.40)])


def mains(d, s):
    """Deux mains levées : paumes rondes et doigts groupés (style moufle)."""
    x, y, w, h = _box(s)
    for cote in (0, 1):
        bx = x + w * (0.02 if cote == 0 else 0.52)
        d.rounded_rectangle([bx, y + h * .18, bx + w * .46, y + h * 1.0],
                            radius=int(w * .12), fill=255)
        for i in range(3):
            d.rounded_rectangle([bx + w * (.04 + i * .14), y + h * (.08 + abs(1 - i) * .05),
                                 bx + w * (.18 + i * .14), y + h * .40],
                                radius=int(w * .05), fill=255)
def pouce(d, s):
    """Pouce levé : poing fermé et pouce dressé."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .18, y + h * .40, x + w * .86, y + h * .96],
                        radius=int(w * .12), fill=255)
    d.rounded_rectangle([x + w * .34, y + h * .02, x + w * .62, y + h * .48],
                        radius=int(w * .12), fill=255)
    for i in range(3):
        d.rectangle([x + w * (.28 + i * .20), y + h * .58,
                     x + w * (.38 + i * .20), y + h * .88], fill=0)
def personne(d, s):
    x, y, w, h = _box(s)
    d.ellipse([x + w * .30, y + h * .04, x + w * .70, y + h * .46], fill=255)
    d.pieslice([x + w * .10, y + h * .44, x + w * .90, y + h * 1.24], 180, 360, fill=255)


def groupe(d, s):
    """Trois personnes : têtes rondes et bustes, bien séparés."""
    x, y, w, h = _box(s)
    for cx, cy, r in ((.50, .24, .13), (.16, .38, .115), (.84, .38, .115)):
        d.ellipse([x + w * (cx - r), y + h * (cy - r),
                   x + w * (cx + r), y + h * (cy + r)], fill=255)
        d.rounded_rectangle([x + w * (cx - r * 1.5), y + h * (cy + r * 1.15),
                             x + w * (cx + r * 1.5), y + h * 1.0],
                            radius=int(w * .07), fill=255)
def megaphone(d, s):
    """Mégaphone : cône tourné vers la droite, poignée, deux ondes."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .10, y + h * .34), (x + w * .66, y + h * .10),
               (x + w * .66, y + h * .76), (x + w * .10, y + h * .52)], fill=255)
    d.polygon([(x + w * .66, y + h * .10), (x + w * .80, y + h * .06),
               (x + w * .80, y + h * .80), (x + w * .66, y + h * .76)], fill=255)
    d.rounded_rectangle([x + w * .20, y + h * .50, x + w * .34, y + h * .86],
                        radius=int(w * .05), fill=255)
    for i in range(2):
        d.arc([x + w * (.80 + i * .08), y + h * (.18 - i * .1),
               x + w * (1.0 + i * .08), y + h * (.86 + i * .1)], 300, 60,
              fill=255, width=int(w * .05))
def cloche(d, s):
    """Cloche : dôme arrondi, jupe évasée, battant visible dessous."""
    x, y, w, h = _box(s)
    d.pieslice([x + w * .12, y + h * .06, x + w * .88, y + h * .86], 180, 360, fill=255)
    d.polygon([(x + w * .12, y + h * .46), (x + w * .88, y + h * .46),
               (x + w * .96, y + h * .78), (x + w * .04, y + h * .78)], fill=255)
    d.rounded_rectangle([x + w * .04, y + h * .74, x + w * .96, y + h * .84],
                        radius=int(w * .04), fill=255)
    d.ellipse([x + w * .44, y + h * .84, x + w * .56, y + h * .98], fill=255)
    d.rectangle([x + w * .46, y + h * .00, x + w * .54, y + h * .16], fill=255)
def maison(d, s):
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w, y + h * .46), (x, y + h * .46)], fill=255)
    d.rectangle([x + w * .12, y + h * .40, x + w * .88, y + h], fill=255)


def cadeau(d, s):
    x, y, w, h = _box(s)
    d.rounded_rectangle([x, y + h * .30, x + w, y + h], radius=int(w * .06), fill=255)
    d.rectangle([x - w * .04, y + h * .16, x + w * 1.04, y + h * .34], fill=255)
    d.ellipse([x + w * .30, y + h * .02, x + w * .50, y + h * .18], fill=255)
    d.ellipse([x + w * .50, y + h * .02, x + w * .70, y + h * .18], fill=255)


def main_coeur(d, s):
    """Main ouverte (moufle) avec un cœur au-dessus."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .36, y, x + w * .50, y + h * .16], fill=255)
    d.ellipse([x + w * .50, y, x + w * .64, y + h * .16], fill=255)
    d.polygon([(x + w * .34, y + h * .10), (x + w * .66, y + h * .10),
               (x + w * .50, y + h * .30)], fill=255)
    d.rounded_rectangle([x + w * .22, y + h * .34, x + w * .78, y + h * .92],
                        radius=int(w * .12), fill=255)
    for i in range(3):
        d.rounded_rectangle([x + w * (.26 + i * .16), y + h * .30,
                             x + w * (.40 + i * .16), y + h * .50],
                            radius=int(w * .05), fill=255)
    d.rounded_rectangle([x + w * .30, y + h * .90, x + w * .70, y + h * 1.02],
                        radius=int(w * .04), fill=255)
