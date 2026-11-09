"""tools/emotes/shapes5.py — nouvelles silhouettes (2/3 : gaming, communauté, animaux)."""
from .shapes import _b, _box, _poly
from .shapes3 import _tete


# ══════════════════════ GAMING (nouveautés) ══════════════════════
def pioche(d, s):
    """Pioche : lame en V ouvert, manche sous la pointe."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .44, y + h * .30, x + w * .56, y + h * 1.0],
                        radius=int(w * .05), fill=255)
    d.polygon([(x + w * .50, y + h * .26), (x + w * .06, y + h * .10),
               (x + w * .02, y + h * .02), (x + w * .14, y + h * .04),
               (x + w * .52, y + h * .16), (x + w * .90, y + h * .04),
               (x + w * .98, y + h * .02), (x + w * .94, y + h * .10)], fill=255)
    d.polygon([(x + w * .02, y + h * .02), (x + w * .20, y + h * .30),
               (x + w * .02, y + h * .22)], fill=255)
    d.polygon([(x + w * .98, y + h * .02), (x + w * .80, y + h * .30),
               (x + w * .98, y + h * .22)], fill=255)
def marteau(d, s):
    """Marteau : tête massive en haut, manche vertical."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .04, y + h * .04, x + w * .96, y + h * .36],
                        radius=int(w * .07), fill=255)
    d.rounded_rectangle([x + w * .42, y + h * .30, x + w * .58, y + h * 1.0],
                        radius=int(w * .05), fill=255)
    d.rounded_rectangle([x + w * .10, y + h * .12, x + w * .34, y + h * .28],
                        radius=int(w * .04), fill=0)
    d.rounded_rectangle([x + w * .66, y + h * .12, x + w * .90, y + h * .28],
                        radius=int(w * .04), fill=0)

def arc(d, s):
    """Arc + flèche prête à partir."""
    x, y, w, h = _box(s)
    d.arc([x, y, x + w * .92, y + h], 300, 60, fill=255, width=int(w * .11))
    d.line([(x + w * .28, y + h * .50), (x + w * .52, y + h * .50)], fill=255, width=int(w * .04))
    d.line([(x + w * .18, y + h * .50), (x + w * .86, y + h * .50)], fill=255, width=int(w * .07))
    d.polygon([(x + w * .98, y + h * .50), (x + w * .78, y + h * .34),
               (x + w * .78, y + h * .66)], fill=255)


def cible(d, s):
    """Cible : trois anneaux concentriques évidés."""
    x, y, w, h = _box(s)
    cx, cy = x + w * .5, y + h * .5
    r = w * .5
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    d.ellipse([cx - r * .72, cy - r * .72, cx + r * .72, cy + r * .72], fill=0)
    d.ellipse([cx - r * .46, cy - r * .46, cx + r * .46, cy + r * .46], fill=255)
    d.ellipse([cx - r * .20, cy - r * .20, cx + r * .20, cy + r * .20], fill=0)


def borne_arcade(d, s):
    """Borne d'arcade : écran, boutons, monnayeur."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .08, y, x + w * .92, y + h], radius=int(w * .10), fill=255)
    d.rounded_rectangle([x + w * .18, y + h * .08, x + w * .82, y + h * .46],
                        radius=int(w * .04), fill=0)
    d.rounded_rectangle([x + w * .20, y + h * .56, x + w * .46, y + h * .72],
                        radius=int(w * .03), fill=0)
    d.ellipse([x + w * .58, y + h * .56, x + w * .72, y + h * .70], fill=0)
    d.ellipse([x + w * .76, y + h * .58, x + w * .88, y + h * .70], fill=0)
    d.rectangle([x + w * .34, y + h * .82, x + w * .66, y + h * .90], fill=0)


def puzzle(d, s):
    """Pièce de puzzle : carré avec tenon et encoche."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .10, y + h * .10, x + w * .90, y + h * .90],
                        radius=int(w * .07), fill=255)
    d.ellipse([x + w * .34, y + h * .02, x + w * .66, y + h * .30], fill=255)
    d.ellipse([x + w * .70, y + h * .34, x + w * .98, y + h * .66], fill=255)
    d.ellipse([x + w * .38, y + h * .72, x + w * .62, y + h * .96], fill=0)


def console_portable(d, s):
    """Console portable : écran central, croix directionnelle, deux boutons."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .02, y + h * .14, x + w * .98, y + h * .86],
                        radius=int(w * .18), fill=255)
    d.rounded_rectangle([x + w * .30, y + h * .26, x + w * .70, y + h * .74],
                        radius=int(w * .05), fill=0)
    d.rectangle([x + w * .13, y + h * .44, x + w * .22, y + h * .62], fill=0)
    d.rectangle([x + w * .08, y + h * .49, x + w * .27, y + h * .57], fill=0)
    d.ellipse([x + w * .76, y + h * .42, x + w * .86, y + h * .52], fill=0)
    d.ellipse([x + w * .78, y + h * .58, x + w * .88, y + h * .68], fill=0)


# ══════════════════════ COMMUNAUTÉ (nouveautés) ══════════════════════
def cafe(d, s):
    """Tasse de café fumante : anse, corps, soucoupe, vapeur."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .10, y + h * .36, x + w * .74, y + h * .82],
                        radius=int(w * .10), fill=255)
    d.ellipse([x + w * .66, y + h * .44, x + w * 1.0, y + h * .74], outline=255, width=int(w * .07))
    d.rounded_rectangle([x + w * .02, y + h * .82, x + w * .90, y + h * .94],
                        radius=int(w * .05), fill=255)
    for i, cx in enumerate((.28, .46)):
        d.arc([x + w * (cx - .06), y + h * (.04 + i * .04),
               x + w * (cx + .06), y + h * (.30 + i * .04)], 300, 60,
              fill=255, width=int(w * .045))


def note_musique(d, s):
    """Note de musique : tête ronde, hampe fine, double crochet."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .06, y + h * .62, x + w * .42, y + h * .96], fill=255)
    d.rectangle([x + w * .34, y + h * .06, x + w * .42, y + h * .80], fill=255)
    d.polygon([(x + w * .42, y + h * .06), (x + w * .94, y + h * .24),
               (x + w * .94, y + h * .38), (x + w * .42, y + h * .24)], fill=255)
    d.polygon([(x + w * .42, y + h * .30), (x + w * .80, y + h * .42),
               (x + w * .80, y + h * .56), (x + w * .42, y + h * .48)], fill=255)
def appareil_photo(d, s):
    """Appareil photo : boîtier, objectif, flash, viseur."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .02, y + h * .24, x + w * .98, y + h * .92],
                        radius=int(w * .10), fill=255)
    d.rounded_rectangle([x + w * .30, y + h * .10, x + w * .62, y + h * .28],
                        radius=int(w * .04), fill=255)
    cx, cy = x + w * .50, y + h * .58
    r = w * .22
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=0)
    d.rounded_rectangle([x + w * .78, y + h * .30, x + w * .92, y + h * .38],
                        radius=int(w * .02), fill=0)


def fanion(d, s):
    """Fanion triangulaire sur sa hampe."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .12, y, x + w * .24, y + h], radius=int(w * .04), fill=255)
    d.polygon([(x + w * .24, y + h * .04), (x + w * .98, y + h * .30),
               (x + w * .24, y + h * .56)], fill=255)


def bulle_idee(d, s):
    """Bulle de bande dessinée avec trois points."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .02, y, x + w * .98, y + h * .78], fill=255)
    d.polygon([(x + w * .30, y + h * .68), (x + w * .22, y + h * 1.0),
               (x + w * .56, y + h * .74)], fill=255)
    for i in range(3):
        cx = x + w * (.30 + i * .20)
        d.ellipse([cx - w * .07, y + h * .30, cx + w * .07, y + h * .44], fill=0)


def table_reunion(d, s):
    """Table ronde pleine et quatre personnes autour."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .26, y + h * .28, x + w * .74, y + h * .76], fill=255)
    for cx, cy in ((.50, .04), (.50, .92), (.06, .52), (.94, .52)):
        d.ellipse([x + w * (cx - .105), y + h * (cy - .095), x + w * (cx + .105), y + h * (cy + .095)],
                  fill=255)
    d.arc([x + w * .26, y + h * .28, x + w * .74, y + h * .76], 0, 360, fill=0, width=int(w * .05))
def tigre(d, s):
    """Tête de tigre : oreilles pointues + rayures claires."""
    x, y, w, h = _box(s)
    _tete(d, s, 'pointues')
    for cx in (.34, .50, .66):
        d.rectangle([x + w * cx - w * .025, y + h * .20, x + w * cx + w * .025, y + h * .40], fill=0)
    for cx in (.24, .76):
        d.rectangle([x + w * cx - w * .02, y + h * .42, x + w * cx + w * .02, y + h * .56], fill=0)


def fer_a_cheval(d, s):
    """Fer à cheval : arc ouvert vers le bas, clous évides."""
    x, y, w, h = _box(s)
    d.arc([x + w * .04, y, x + w * .96, y + h * 1.04], 190, 350, fill=255, width=int(w * .22))
    d.polygon([(x + w * .02, y + h * .46), (x + w * .24, y + h * .40),
               (x + w * .24, y + h * .78), (x + w * .02, y + h * .72)], fill=255)
    d.polygon([(x + w * .98, y + h * .46), (x + w * .76, y + h * .40),
               (x + w * .76, y + h * .78), (x + w * .98, y + h * .72)], fill=255)
    for cx, cy in ((.22, .20), (.50, .12), (.78, .20), (.30, .46), (.70, .46)):
        d.ellipse([x + w * (cx - .045), y + h * (cy - .05), x + w * (cx + .045), y + h * (cy + .05)],
                  fill=0)
def singe(d, s):
    """Tête de singe : larges oreilles, museau clair."""
    x, y, w, h = _box(s)
    d.ellipse([x - w * .02, y + h * .22, x + w * .30, y + h * .58], fill=255)
    d.ellipse([x + w * .70, y + h * .22, x + w * 1.02, y + h * .58], fill=255)
    d.ellipse([x + w * .10, y + h * .10, x + w * .90, y + h * .94], fill=255)
    d.ellipse([x + w * .26, y + h * .54, x + w * .74, y + h * .96], fill=0)
    d.ellipse([x + w * .26, y + h * .54, x + w * .74, y + h * .96], fill=255)
    d.ellipse([x + w * .32, y + h * .38, x + w * .44, y + h * .50], fill=0)
    d.ellipse([x + w * .56, y + h * .38, x + w * .68, y + h * .50], fill=0)


def hibou(d, s):
    """Hibou : corps rond, aigrettes, grands yeux, bec."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .12, y + h * .30), (x + w * .16, y), (x + w * .38, y + h * .18)], fill=255)
    d.polygon([(x + w * .88, y + h * .30), (x + w * .84, y), (x + w * .62, y + h * .18)], fill=255)
    d.ellipse([x + w * .06, y + h * .08, x + w * .94, y + h * 1.0], fill=255)
    for cx in (.32, .68):
        d.ellipse([x + w * (cx - .13), y + h * .30, x + w * (cx + .13), y + h * .56], fill=0)
    d.polygon([(x + w * .44, y + h * .56), (x + w * .56, y + h * .56),
               (x + w * .50, y + h * .72)], fill=0)


def tortue(d, s):
    """Tortue : carapace bombée, tête sortie, quatre pattes."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .04, y + h * .10, x + w * .82, y + h * .82], fill=255)
    d.rectangle([x + w * .04, y + h * .48, x + w * .82, y + h * .82], fill=255)
    d.ellipse([x + w * .74, y + h * .34, x + w * 1.0, y + h * .66], fill=255)
    for cx in (.14, .34, .60, .78):
        d.rounded_rectangle([x + w * (cx - .07), y + h * .70, x + w * (cx + .07), y + h * .98],
                            radius=int(w * .04), fill=255)
    d.ellipse([x + w * .26, y + h * .24, x + w * .60, y + h * .50], fill=0)
    d.line([(x + w * .18, y + h * .44), (x + w * .68, y + h * .44)], fill=0, width=int(w * .04))
    d.ellipse([x + w * .84, y + h * .44, x + w * .90, y + h * .50], fill=0)
def baleine(d, s):
    """Baleine : corps rond, queue en V, jet d'eau, oeil evidé."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .04, y + h * .22, x + w * .82, y + h * .86], fill=255)
    d.polygon([(x + w * .76, y + h * .44), (x + w * 1.0, y + h * .24),
               (x + w * .94, y + h * .54), (x + w * 1.0, y + h * .84),
               (x + w * .74, y + h * .64)], fill=255)
    d.polygon([(x + w * .26, y + h * .20), (x + w * .40, y + h * .02),
               (x + w * .46, y + h * .26)], fill=255)
    d.ellipse([x + w * .20, y + h * .48, x + w * .30, y + h * .58], fill=0)
    d.arc([x + w * .10, y - h * .06, x + w * .30, y + h * .24], 250, 80, fill=255, width=int(w * .05))
def crabe(d, s):
    """Crabe : carapace large, deux grosses pinces ouvertes, pattes."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .20, y + h * .34, x + w * .80, y + h * .82],
                        radius=int(w * .22), fill=255)
    for cote in (0, 1):
        cx = x + w * (.08 if cote == 0 else .92)
        d.ellipse([cx - w * .16, y + h * .14, cx + w * .16, y + h * .46], fill=255)
        d.polygon([(cx - w * .16, y + h * .16), (cx + w * .02, y + h * .06),
                   (cx + w * .04, y + h * .28), (cx - w * .12, y + h * .30)], fill=0)
        d.rectangle([cx - w * .05, y + h * .44, cx + w * .05, y + h * .58], fill=255)
        for i in range(2):
            px = x + w * (.26 + i * .10) if cote == 0 else x + w * (.74 - i * .10)
            d.line([(px, y + h * .78), (px + w * (.08 if cote == 0 else -.08), y + h * .98)],
                   fill=255, width=int(w * .05))
    d.ellipse([x + w * .36, y + h * .48, x + w * .44, y + h * .58], fill=0)
    d.ellipse([x + w * .56, y + h * .48, x + w * .64, y + h * .58], fill=0)
def souris(d, s):
    """Souris : grandes oreilles rondes, museau pointu."""
    x, y, w, h = _box(s)
    d.ellipse([x, y, x + w * .48, y + h * .48], fill=255)
    d.ellipse([x + w * .52, y, x + w * 1.0, y + h * .48], fill=255)
    d.ellipse([x + w * .14, y + h * .22, x + w * .86, y + h * 1.0], fill=255)
    d.ellipse([x + w * .06, y + h * .52, x + w * .26, y + h * .68], fill=255)
    d.ellipse([x + w * .74, y + h * .52, x + w * .94, y + h * .68], fill=255)
    d.ellipse([x + w * .32, y + h * .48, x + w * .44, y + h * .60], fill=0)
    d.ellipse([x + w * .56, y + h * .48, x + w * .68, y + h * .60], fill=0)


def coccinelle(d, s):
    """Coccinelle : dôme rouge, tête, points, ligne centrale."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .42, y, x + w * .58, y + h * .18], fill=255)
    d.ellipse([x + w * .12, y + h * .10, x + w * .88, y + h * .88], fill=255)
    d.rectangle([x + w * .485, y + h * .12, x + w * .515, y + h * .86], fill=0)
    for cx, cy in ((.32, .34), (.68, .34), (.28, .60), (.72, .60)):
        d.ellipse([x + w * (cx - .07), y + h * (cy - .07), x + w * (cx + .07), y + h * (cy + .07)],
                  fill=0)
    for cx in (.20, .80):
        d.line([(x + w * cx, y + h * .70), (x + w * (cx - .06 if cx < .5 else cx + .06), y + h * .96)],
               fill=255, width=int(w * .04))


def elephant(d, s):
    """Éléphant de profil : corps, grande oreille, trompe qui descend."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .02, y + h * .12, x + w * .72, y + h * .74], fill=255)
    d.ellipse([x + w * .16, y + h * .22, x + w * .60, y + h * .70], fill=255)
    d.ellipse([x + w * .30, y + h * .18, x + w * .74, y + h * .80], fill=255)
    d.rounded_rectangle([x + w * .58, y + h * .50, x + w * .80, y + h * .92],
                        radius=int(w * .10), fill=255)
    d.polygon([(x + w * .62, y + h * .86), (x + w * .82, y + h * .88),
               (x + w * .78, y + h * 1.0), (x + w * .60, y + h * .98)], fill=255)
    for cx in (.14, .34):
        d.rounded_rectangle([x + w * (cx - .07), y + h * .66, x + w * (cx + .07), y + h * .96],
                            radius=int(w * .04), fill=255)
    d.ellipse([x + w * .18, y + h * .30, x + w * .34, y + h * .46], fill=0)
    d.arc([x + w * .14, y + h * .22, x + w * .58, y + h * .74], 300, 60,
          fill=0, width=int(w * .04))
