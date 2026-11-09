"""tools/emotes/shapes7.py — silhouettes utiles à un bot (contrôles, salons, statuts)."""
import math

from .shapes import _b, _box, _poly


# ══════════════════════ SALONS / DISCORD ══════════════════════
def hashtag(d, s):
    """Salon texte : dièse épais."""
    x, y, w, h = _box(s)
    e = int(w * .11)
    for cx in (.36, .64):
        d.line([(x + w * cx, y + h * .06), (x + w * (cx - .06), y + h * .94)],
               fill=255, width=e)
    for cy in (.36, .64):
        d.line([(x + w * .08, y + h * cy), (x + w * .92, y + h * (cy + .02))],
               fill=255, width=e)


def fil(d, s):
    """Fil de discussion : message principal + deux réponses décalées."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .22, y + h * .04, x + w * .98, y + h * .38],
                        radius=int(w * .08), fill=255)
    d.rounded_rectangle([x + w * .02, y + h * .46, x + w * .70, y + h * .74],
                        radius=int(w * .07), fill=255)
    d.rounded_rectangle([x + w * .30, y + h * .80, x + w * .98, y + h * 1.0],
                        radius=int(w * .06), fill=255)


def forum(d, s):
    """Forum : trois salons empilés avec une ligne de chacun."""
    x, y, w, h = _box(s)
    for i in range(3):
        yy = y + h * (.04 + i * .32)
        d.rounded_rectangle([x + w * .04, yy, x + w * .96, yy + h * .26],
                            radius=int(w * .06), fill=255)
        d.rectangle([x + w * .44, yy + h * .08, x + w * .88, yy + h * .15], fill=0)


def micro(d, s):
    """Micro : capsule, arceau, pied."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .36, y + h * .02, x + w * .64, y + h * .54],
                        radius=int(w * .14), fill=255)
    d.arc([x + w * .16, y + h * .20, x + w * .84, y + h * .80], 0, 180,
          fill=255, width=int(w * .08))
    d.rectangle([x + w * .46, y + h * .76, x + w * .54, y + h * .94], fill=255)
    d.rounded_rectangle([x + w * .28, y + h * .90, x + w * .72, y + h * 1.0],
                        radius=int(w * .04), fill=255)


def micro_barre(d, s):
    """Micro coupé (mute) : micro + barre diagonale."""
    micro(d, s)
    x, y, w, h = _box(s)
    d.line([(x + w * .10, y + h * .92), (x + w * .92, y + h * .08)],
           fill=0, width=int(w * .13))


def casque_vocal(d, s):
    """Casque vocal : arceau et deux oreillettes."""
    x, y, w, h = _box(s)
    d.arc([x + w * .10, y + h * .08, x + w * .90, y + h * .92], 180, 360,
          fill=255, width=int(w * .13))
    for cx in (.10, .90):
        d.rounded_rectangle([x + w * (cx - .10), y + h * .40, x + w * (cx + .10), y + h * .84],
                            radius=int(w * .08), fill=255)


# ══════════════════════ ACTIONS / CONTRÔLES ══════════════════════
def fleche_haut(d, s):
    """Flèche vers le haut (monter, remonter, promotion)."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y), (x + w * .96, y + h * .44),
               (x + w * .70, y + h * .44), (x + w * .70, y + h),
               (x + w * .30, y + h), (x + w * .30, y + h * .44),
               (x + w * .04, y + h * .44)], fill=255)


def fleche_bas(d, s):
    """Flèche vers le bas (descendre, rétrograder)."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .50, y + h), (x + w * .96, y + h * .56),
               (x + w * .70, y + h * .56), (x + w * .70, y),
               (x + w * .30, y), (x + w * .30, y + h * .56),
               (x + w * .04, y + h * .56)], fill=255)


def fleche_droite(d, s):
    """Flèche vers la droite (transférer, passer au suivant)."""
    x, y, w, h = _box(s)
    d.polygon([(x + w, y + h * .50), (x + w * .56, y + h * .96),
               (x + w * .56, y + h * .70), (x, y + h * .70),
               (x, y + h * .30), (x + w * .56, y + h * .30),
               (x + w * .56, y + h * .04)], fill=255)


def double_fleche(d, s):
    """Double flèche (échange, transfert entre deux personnes)."""
    x, y, w, h = _box(s)
    for i, (yy, sens) in enumerate(((.30, 1), (.66, -1))):
        pts = [(x, y + h * yy), (x + w * .22, y + h * (yy - .16)),
               (x + w * .22, y + h * (yy - .06)), (x + w * .96, y + h * (yy - .06)),
               (x + w * .96, y + h * (yy + .06)), (x + w * .22, y + h * (yy + .06)),
               (x + w * .22, y + h * (yy + .16))]
        if sens < 0:
            pts = [(x + w - px + x, py) for px, py in pts]
        d.polygon(pts, fill=255)


def play(d, s):
    """Lecture (événement, stream, vidéo)."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .18, y + h * .04), (x + w * .94, y + h * .50),
               (x + w * .18, y + h * .96)], fill=255)


def pause(d, s):
    """Pause (événement en pause)."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .18, y + h * .06, x + w * .42, y + h * .94],
                        radius=int(w * .05), fill=255)
    d.rounded_rectangle([x + w * .58, y + h * .06, x + w * .82, y + h * .94],
                        radius=int(w * .05), fill=255)


def stop(d, s):
    """Arrêt (fin, clôture)."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .10, y + h * .10, x + w * .90, y + h * .90],
                        radius=int(w * .10), fill=255)


def cercle_check(d, s):
    """Cercle avec une coche (validé, réussi)."""
    x, y, w, h = _box(s)
    d.ellipse([x, y, x + w, y + h], fill=255)
    d.line([(x + w * .26, y + h * .52), (x + w * .44, y + h * .70),
            (x + w * .76, y + h * .32)], fill=0, width=int(w * .09), joint='curve')


def cercle_croix(d, s):
    """Cercle avec une croix (refusé, échec)."""
    x, y, w, h = _box(s)
    d.ellipse([x, y, x + w, y + h], fill=255)
    for a, b in (((.30, .30), (.70, .70)), ((.70, .30), (.30, .70))):
        d.line([(x + w * a[0], y + h * a[1]), (x + w * b[0], y + h * b[1])],
               fill=0, width=int(w * .11))


def clavier(d, s):
    """Bouton / clavier (interaction, menu)."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .02, y + h * .26, x + w * .98, y + h * .86],
                        radius=int(w * .10), fill=255)
    for i in range(3):
        for j in range(2):
            d.rounded_rectangle([x + w * (.12 + i * .26), y + h * (.40 + j * .18),
                                 x + w * (.30 + i * .26), y + h * (.52 + j * .18)],
                                radius=int(w * .03), fill=0)
    d.rounded_rectangle([x + w * .32, y + h * .74, x + w * .68, y + h * .82],
                        radius=int(w * .02), fill=0)


def point_online(d, s):
    """Pastille « en ligne » : disque plein."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .10, y + h * .10, x + w * .90, y + h * .90], fill=255)


def point_offline(d, s):
    """Pastille « hors ligne » : disque évidé."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .10, y + h * .10, x + w * .90, y + h * .90],
              outline=255, width=int(w * .16))


def ping(d, s):
    """Latence : trois barres croissantes."""
    x, y, w, h = _box(s)
    for i, hh in enumerate((.32, .58, .88)):
        d.rounded_rectangle([x + w * (.10 + i * .30), y + h * (1 - hh),
                             x + w * (.28 + i * .30), y + h],
                            radius=int(w * .04), fill=255)


def lien(d, s):
    """Lien d'invitation : deux maillons entrelacés."""
    x, y, w, h = _box(s)
    for cx, cy in ((.34, .34), (.66, .66)):
        d.ellipse([x + w * (cx - .26), y + h * (cy - .26),
                   x + w * (cx + .26), y + h * (cy + .26)],
                  outline=255, width=int(w * .10))
    d.line([(x + w * .34, y + h * .34), (x + w * .66, y + h * .66)],
           fill=255, width=int(w * .10))


def image(d, s):
    """Image : cadre, soleil et relief."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .02, y + h * .14, x + w * .98, y + h * .86],
                        radius=int(w * .08), fill=255)
    d.rounded_rectangle([x + w * .10, y + h * .22, x + w * .90, y + h * .78],
                        radius=int(w * .05), fill=0)
    d.ellipse([x + w * .22, y + h * .32, x + w * .40, y + h * .50], fill=255)
    d.polygon([(x + w * .16, y + h * .74), (x + w * .44, y + h * .46),
               (x + w * .62, y + h * .64), (x + w * .74, y + h * .52),
               (x + w * .86, y + h * .74)], fill=255)


def fichier(d, s):
    """Fichier : feuille avec coin plié."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .18, y), (x + w * .64, y), (x + w * .88, y + h * .24),
               (x + w * .88, y + h), (x + w * .18, y + h)], fill=255)
    d.polygon([(x + w * .64, y), (x + w * .88, y + h * .24), (x + w * .64, y + h * .24)],
              fill=0)


def sondage(d, s):
    """Sondage : trois barres de résultat."""
    x, y, w, h = _box(s)
    for i, lg in enumerate((.88, .58, .34)):
        yy = y + h * (.14 + i * .28)
        d.rounded_rectangle([x + w * .04, yy, x + w * (.04 + lg), yy + h * .18],
                            radius=int(w * .05), fill=255)


def tag(d, s):
    """Étiquette de rôle : tag avec trou."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .30, y + h * .20), (x + w * .96, y + h * .20),
               (x + w * .96, y + h * .80), (x + w * .30, y + h * .80),
               (x + w * .04, y + h * .50)], fill=255)
    d.ellipse([x + w * .16, y + h * .42, x + w * .28, y + h * .58], fill=0)


def cle_plate(d, s):
    """Clé plate / outil de maintenance."""
    x, y, w, h = _box(s)
    d.line([(x + w * .18, y + h * .90), (x + w * .78, y + h * .22)],
           fill=255, width=int(w * .13))
    d.polygon([(x + w * .70, y + h * .30), (x + w * .96, y + h * .04),
               (x + w * .96, y + h * .26), (x + w * .80, y + h * .42)], fill=255)
    d.ellipse([x + w * .04, y + h * .74, x + w * .34, y + h * 1.0], fill=255)
    d.ellipse([x + w * .12, y + h * .82, x + w * .26, y + h * .94], fill=0)


def entonnoir(d, s):
    """Entonnoir (filtre)."""
    x, y, w, h = _box(s)
    d.polygon([(x + w * .04, y + h * .06), (x + w * .96, y + h * .06),
               (x + w * .58, y + h * .58), (x + w * .58, y + h * .90),
               (x + w * .42, y + h * .90), (x + w * .42, y + h * .58)], fill=255)
