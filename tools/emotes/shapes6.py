"""tools/emotes/shapes6.py — nouvelles silhouettes (3/3 : sécurité, système, premium, divers)."""
from .shapes import _b, _box, _poly


# ══════════════════════ SÉCURITÉ (nouveautés) ══════════════════════
def camera(d, s):
    """Caméra de surveillance : boîtier incliné, objectif, support."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .06, y + h * .16, x + w * .80, y + h * .56],
                        radius=int(w * .08), fill=255)
    d.ellipse([x + w * .62, y + h * .22, x + w * .92, y + h * .52], fill=255)
    d.ellipse([x + w * .70, y + h * .28, x + w * .84, y + h * .46], fill=0)
    d.rounded_rectangle([x + w * .24, y + h * .54, x + w * .40, y + h * .76],
                        radius=int(w * .04), fill=255)
    d.rounded_rectangle([x + w * .10, y + h * .74, x + w * .54, y + h * .86],
                        radius=int(w * .04), fill=255)
    d.polygon([(x + w * .54, y + h * .80), (x + w * .96, y + h * .90),
               (x + w * .54, y + h * 1.0)], fill=255)


def gyrophare(d, s):
    """Gyrophare : dôme lumineux sur socle + éclats."""
    x, y, w, h = _box(s)
    d.pieslice([x + w * .16, y + h * .16, x + w * .84, y + h * .86], 180, 360, fill=255)
    d.rounded_rectangle([x + w * .10, y + h * .50, x + w * .90, y + h * .74],
                        radius=int(w * .05), fill=255)
    for i in range(3):
        d.line([(x + w * (.20 + i * .30), y + h * .06), (x + w * (.26 + i * .30), y - h * .02)],
               fill=255, width=int(w * .05))


def empreinte(d, s):
    """Empreinte digitale : arcs concentriques ouverts en bas."""
    x, y, w, h = _box(s)
    for i, r in enumerate((.46, .34, .22, .10)):
        d.arc([x + w * (.5 - r), y + h * (.5 - r), x + w * (.5 + r), y + h * (.5 + r)],
              200, 340, fill=255, width=int(w * .06))
    d.arc([x + w * (.5 - .46), y + h * (.5 - .46), x + w * (.5 + .46), y + h * (.5 + .46)],
          20, 160, fill=255, width=int(w * .06))


def virus(d, s):
    """Virus : corps rond, pointes, anneau intérieur."""
    import math
    x, y, w, h = _box(s)
    cx, cy, r = x + w * .5, y + h * .5, w * .34
    for i in range(8):
        a = i * math.pi / 4
        d.line([(cx + math.cos(a) * r * .8, cy + math.sin(a) * r * .8),
                (cx + math.cos(a) * r * 1.45, cy + math.sin(a) * r * 1.45)],
               fill=255, width=int(w * .06))
        d.ellipse([cx + math.cos(a) * r * 1.45 - w * .06, cy + math.sin(a) * r * 1.45 - w * .06,
                   cx + math.cos(a) * r * 1.45 + w * .06, cy + math.sin(a) * r * 1.45 + w * .06],
                  fill=255)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    d.ellipse([cx - r * .52, cy - r * .52, cx + r * .52, cy + r * .52], fill=0)


def etoile_badge(d, s):
    """Étoile de shérif à cinq branches."""
    import math
    x, y, w, h = _box(s)
    cx, cy, r = x + w * .5, y + h * .5, w * .5
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * .45
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    d.polygon(pts, fill=255)


def cadenas_ouvert(d, s):
    """Cadenas ouvert : anse relevée d'un côté."""
    x, y, w, h = _box(s)
    d.arc([x + w * .34, y, x + w * .96, y + h * .52], 180, 360, fill=255, width=int(w * .12))
    d.rectangle([x + w * .34, y + h * .20, x + w * .46, y + h * .40], fill=255)
    d.rounded_rectangle([x + w * .08, y + h * .40, x + w * .72, y + h * 1.0],
                        radius=int(w * .09), fill=255)
    d.ellipse([x + w * .32, y + h * .58, x + w * .48, y + h * .74], fill=0)
    d.rectangle([x + w * .37, y + h * .70, x + w * .43, y + h * .90], fill=0)


def gant(d, s):
    """Gant / main gantée : paume, quatre doigts, pouce, poignet."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .20, y + h * .34, x + w * .84, y + h * .82],
                        radius=int(w * .10), fill=255)
    for i in range(4):
        cx = x + w * (.28 + i * .15)
        d.rounded_rectangle([cx - w * .055, y + h * (.04 + abs(1.5 - i) * .045),
                             cx + w * .055, y + h * .44],
                            radius=int(w * .05), fill=255)
    d.rounded_rectangle([x + w * .02, y + h * .40, x + w * .24, y + h * .64],
                        radius=int(w * .09), fill=255)
    d.rounded_rectangle([x + w * .26, y + h * .80, x + w * .78, y + h * 1.0],
                        radius=int(w * .05), fill=255)
def terminal(d, s):
    """Fenêtre de terminal : barre de titre, chevron et curseur."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .02, y + h * .06, x + w * .98, y + h * .94],
                        radius=int(w * .08), fill=255)
    d.rounded_rectangle([x + w * .10, y + h * .16, x + w * .90, y + h * .84],
                        radius=int(w * .04), fill=0)
    d.line([(x + w * .20, y + h * .34), (x + w * .30, y + h * .48),
            (x + w * .20, y + h * .62)], fill=255, width=int(w * .06))
    d.rectangle([x + w * .38, y + h * .56, x + w * .66, y + h * .64], fill=255)


def cle_usb(d, s):
    """Clé USB verticale : connecteur, corps étroit, anneau en bas."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .36, y, x + w * .64, y + h * .24],
                        radius=int(w * .03), fill=255)
    d.rounded_rectangle([x + w * .26, y + h * .20, x + w * .74, y + h * .74],
                        radius=int(w * .08), fill=255)
    d.rounded_rectangle([x + w * .38, y + h * .36, x + w * .62, y + h * .56],
                        radius=int(w * .03), fill=0)
    d.arc([x + w * .30, y + h * .70, x + w * .70, y + h * 1.06], 0, 180,
          fill=255, width=int(w * .08))
def cylindre_bdd(d, s):
    """Base de données : trois cylindres séparés par des rainures."""
    x, y, w, h = _box(s)
    for i in range(3):
        haut = y + h * (.02 + i * .33)
        d.rounded_rectangle([x + w * .10, haut, x + w * .90, haut + h * .30],
                            radius=int(w * .06), fill=255)
        d.arc([x + w * .16, haut + h * .02, x + w * .84, haut + h * .16], 0, 180,
              fill=0, width=int(w * .05))
        d.rectangle([x + w * .10, haut + h * .28, x + w * .90, haut + h * .32], fill=0)
def progression(d, s):
    """Barre de chargement : cadre et blocs remplis."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x, y + h * .34, x + w, y + h * .72], radius=int(w * .10), fill=255)
    d.rounded_rectangle([x + w * .06, y + h * .40, x + w * .94, y + h * .66],
                        radius=int(w * .07), fill=0)
    for i in range(3):
        d.rounded_rectangle([x + w * (.10 + i * .20), y + h * .41, x + w * (.26 + i * .20), y + h * .65],
                            radius=int(w * .04), fill=255)


def update(d, s):
    """Flèches circulaires (mise à jour)."""
    x, y, w, h = _box(s)
    d.arc([x + w * .08, y + h * .08, x + w * .92, y + h * .92], 30, 200,
          fill=255, width=int(w * .13))
    d.arc([x + w * .08, y + h * .08, x + w * .92, y + h * .92], 210, 380,
          fill=255, width=int(w * .13))
    d.polygon([(x + w * .68, y), (x + w * .96, y + h * .20),
               (x + w * .66, y + h * .34)], fill=255)
    d.polygon([(x + w * .32, y + h * 1.0), (x + w * .04, y + h * .80),
               (x + w * .34, y + h * .66)], fill=255)


def code(d, s):
    """Chevrons de code et barre oblique."""
    x, y, w, h = _box(s)
    d.line([(x + w * .34, y + h * .16), (x + w * .06, y + h * .50), (x + w * .34, y + h * .84)],
           fill=255, width=int(w * .11))
    d.line([(x + w * .66, y + h * .16), (x + w * .94, y + h * .50), (x + w * .66, y + h * .84)],
           fill=255, width=int(w * .11))
    d.line([(x + w * .58, y + h * .10), (x + w * .42, y + h * .90)], fill=255, width=int(w * .09))


# ══════════════════════ PREMIUM (nouveautés) ══════════════════════
def bague(d, s):
    """Bague solitaire : anneau épais, chaton et pierre facettée."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .12, y + h * .40, x + w * .88, y + h * 1.04],
              outline=255, width=int(w * .15))
    d.polygon([(x + w * .50, y + h * .04), (x + w * .74, y + h * .24),
               (x + w * .50, y + h * .46), (x + w * .26, y + h * .24)], fill=255)
    d.polygon([(x + w * .50, y + h * .10), (x + w * .66, y + h * .24),
               (x + w * .50, y + h * .38), (x + w * .34, y + h * .24)], fill=0)
    d.rectangle([x + w * .26, y + h * .40, x + w * .74, y + h * .50], fill=255)
def plume(d, s):
    """Plume : grande plume arrondie, tuyau net, barbes légères."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .52, y), (x + w * .90, y + h * .30), (x + w * .84, y + h * .62),
               (x + w * .46, y + h * .84), (x + w * .16, y + h * .98),
               (x + w * .24, y + h * .62), (x + w * .30, y + h * .26)], fill=255)
    d.line([(x + w * .16, y + h * .98), (x + w * .78, y + h * .12)], fill=0, width=int(w * .045))
    for i in range(3):
        px = x + w * (.40 + i * .14)
        d.line([(px, y + h * (.52 - i * .14)), (px + w * .14, y + h * (.40 - i * .14))],
               fill=0, width=int(w * .035))
def etoile_filante(d, s):
    """Étoile filante : étoile + traînée."""
    import math
    x, y, w, h = _box(s)
    cx, cy, r = x + w * .70, y + h * .34, w * .26
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * .44
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    d.polygon(pts, fill=255)
    d.line([(x + w * .52, y + h * .52), (x + w * .04, y + h * .96)], fill=255, width=int(w * .10))
    d.line([(x + w * .58, y + h * .60), (x + w * .24, y + h * .94)], fill=255, width=int(w * .07))


def montre(d, s):
    """Montre : bracelet, boîtier, couronne, aiguilles."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .34, y, x + w * .66, y + h * .22],
                        radius=int(w * .06), fill=255)
    d.rounded_rectangle([x + w * .34, y + h * .78, x + w * .66, y + h],
                        radius=int(w * .06), fill=255)
    d.ellipse([x + w * .12, y + h * .16, x + w * .88, y + h * .84], fill=255)
    d.ellipse([x + w * .22, y + h * .26, x + w * .78, y + h * .74], fill=0)
    d.rectangle([x + w * .48, y + h * .34, x + w * .54, y + h * .52], fill=255)
    d.rectangle([x + w * .50, y + h * .48, x + w * .68, y + h * .54], fill=255)
    d.rectangle([x + w * .86, y + h * .44, x + w * .94, y + h * .56], fill=255)


def coupe_premium(d, s):
    """Coupe de champion : calice en V, pied fin, socle large, deux anses."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .16, y + h * .06), (x + w * .84, y + h * .06),
               (x + w * .70, y + h * .60), (x + w * .30, y + h * .60)], fill=255)
    for cx, a0, a1 in ((.14, 90, 270), (.86, 270, 90)):
        d.arc([x + w * (cx - .13), y + h * .12, x + w * (cx + .13), y + h * .48],
              a0, a1, fill=255, width=int(w * .07))
    d.rectangle([x + w * .45, y + h * .58, x + w * .55, y + h * .80], fill=255)
    d.rounded_rectangle([x + w * .22, y + h * .78, x + w * .78, y + h * .96],
                        radius=int(w * .05), fill=255)
def avion(d, s):
    """Avion vu de dessus."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .60, y + h * .40), (x + w * .58, y + h * .70),
               (x + w * .62, y + h * .90), (x + w * .50, y + h * 1.0),
               (x + w * .38, y + h * .90), (x + w * .42, y + h * .70),
               (x + w * .40, y + h * .40)], fill=255)
    d.polygon([(x + w * .44, y + h * .34), (x, y + h * .58), (x + w * .02, y + h * .64),
               (x + w * .44, y + h * .52)], fill=255)
    d.polygon([(x + w * .56, y + h * .34), (x + w * 1.0, y + h * .58), (x + w * .98, y + h * .64),
               (x + w * .56, y + h * .52)], fill=255)
    d.polygon([(x + w * .50, y + h * .86), (x + w * .38, y + h * 1.0),
               (x + w * .62, y + h * 1.0)], fill=255)


def voiture(d, s):
    """Voiture de profil : carrosserie haute, habitacle, roues à moyeu evidé."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x, y + h * .30, x + w, y + h * .66],
                        radius=int(w * .12), fill=255)
    d.polygon([(x + w * .24, y + h * .32), (x + w * .36, y + h * .06),
               (x + w * .70, y + h * .06), (x + w * .80, y + h * .32)], fill=255)
    d.rectangle([x + w * .40, y + h * .14, x + w * .52, y + h * .28], fill=0)
    d.rectangle([x + w * .56, y + h * .14, x + w * .68, y + h * .28], fill=0)
    for cx in (.25, .75):
        d.ellipse([x + w * (cx - .13), y + h * .58, x + w * (cx + .13), y + h * .86], fill=255)
        d.ellipse([x + w * (cx - .055), y + h * .665, x + w * (cx + .055), y + h * .775], fill=0)
def velo(d, s):
    """Vélo : deux roues, cadre, guidon, selle."""
    x, y, w, h = _box(s)
    for cx in (.20, .80):
        d.ellipse([x + w * (cx - .20), y + h * .56, x + w * (cx + .20), y + h * .96],
                  outline=255, width=int(w * .07))
    d.line([(x + w * .20, y + h * .76), (x + w * .46, y + h * .76), (x + w * .62, y + h * .40),
            (x + w * .30, y + h * .40)], fill=255, width=int(w * .06))
    d.line([(x + w * .46, y + h * .76), (x + w * .62, y + h * .40)], fill=255, width=int(w * .06))
    d.line([(x + w * .60, y + h * .40), (x + w * .84, y + h * .38)], fill=255, width=int(w * .06))
    d.line([(x + w * .78, y + h * .38), (x + w * .80, y + h * .52)], fill=255, width=int(w * .06))
    d.line([(x + w * .24, y + h * .34), (x + w * .36, y + h * .34)], fill=255, width=int(w * .06))


def parapluie(d, s):
    """Parapluie ouvert : dôme, mât, poignée."""
    x, y, w, h = _box(s)
    d.pieslice([x, y + h * .02, x + w, y + h * .92], 180, 360, fill=255)
    d.rectangle([x, y + h * .44, x + w, y + h * .50], fill=0)
    d.rectangle([x + w * .46, y + h * .46, x + w * .54, y + h * .90], fill=255)
    d.arc([x + w * .54, y + h * .76, x + w * .78, y + h * 1.0], 0, 180,
          fill=255, width=int(w * .08))


def valise(d, s):
    """Valise : poignée, corps arrondi, deux fermoirs."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .34, y, x + w * .66, y + h * .12],
                        radius=int(w * .05), fill=255)
    d.rounded_rectangle([x + w * .04, y + h * .12, x + w * .96, y + h * 1.0],
                        radius=int(w * .09), fill=255)
    d.rectangle([x + w * .02, y + h * .46, x + w * .98, y + h * .56], fill=0)
    for cx in (.30, .70):
        d.rounded_rectangle([x + w * (cx - .05), y + h * .70, x + w * (cx + .05), y + h * .82],
                            radius=int(w * .02), fill=0)


def rocher(d, s):
    """Rocher : caillou plein aux angles arrondis, une seule arête."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .28, y + h * .18), (x + w * .66, y + h * .10),
               (x + w * .92, y + h * .38), (x + w * .94, y + h * .72),
               (x + w * .68, y + h * .94), (x + w * .30, y + h * .90),
               (x + w * .08, y + h * .62), (x + w * .12, y + h * .32)], fill=255)
def bulle_question(d, s):
    """Bulle de dialogue avec un grand point d'interrogation."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x, y, x + w, y + h * .74], radius=int(w * .22), fill=255)
    d.polygon([(x + w * .28, y + h * .68), (x + w * .18, y + h * 1.0),
               (x + w * .58, y + h * .72)], fill=255)
    # point d'interrogation : gros crochet ouvert + barre + point
    d.arc([x + w * .30, y + h * .12, x + w * .70, y + h * .54], 170, 20,
          fill=0, width=int(w * .12))
    d.rectangle([x + w * .44, y + h * .38, x + w * .56, y + h * .50], fill=0)
    d.ellipse([x + w * .42, y + h * .54, x + w * .58, y + h * .68], fill=0)


def epee_bouclier(d, s):
    """Bouclier et épée croisés (emblème de jeu)."""
    x, y, w, h = _box(s)
    # bouclier
    d.polygon([(x + w * .30, y + h * .10), (x + w * .78, y + h * .10),
               (x + w * .78, y + h * .56), (x + w * .54, y + h * .84),
               (x + w * .30, y + h * .56)], fill=255)
    # épée en diagonale par-dessus
    d.line([(x + w * .16, y + h * .94), (x + w * .84, y + h * .10)],
           fill=255, width=int(w * .11))
    d.polygon([(x + w * .88, y + h * .02), (x + w * .96, y + h * .20),
               (x + w * .74, y + h * .16)], fill=255)
    d.line([(x + w * .26, y + h * .62), (x + w * .44, y + h * .80)],
           fill=255, width=int(w * .08))
