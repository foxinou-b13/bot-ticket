"""tools/emotes/shapes8.py — silhouettes corrigées (lisibilité à 32 px).

Ces versions remplacent celles des modules précédents : pièces soudées
(pas de trou entre deux morceaux), silhouette reconnaissable d'un coup d'œil.
"""
import math

from .shapes import _b, _box, _poly


# ══════════════════════ FORME / RÉCOMPENSES ══════════════════════
def coeur(d, s):
    """Cœur : deux lobes pleins + pointe, pièces qui se chevauchent."""
    x, y, w, h = _box(s)
    d.ellipse([x, y, x + w * .56, y + h * .62], fill=255)
    d.ellipse([x + w * .44, y, x + w, y + h * .62], fill=255)
    d.polygon([(x, y + h * .44), (x + w * .50, y + h), (x + w, y + h * .44)], fill=255)


def trophée(d, s):
    """Trophée : coupe, deux anses soudées, tige, socle."""
    x, y, w, h = _box(s)
    d.arc([x - w * .02, y + h * .10, x + w * .30, y + h * .52], 90, 270,
          fill=255, width=int(w * .10))
    d.arc([x + w * .70, y + h * .10, x + w * 1.02, y + h * .52], 270, 90,
          fill=255, width=int(w * .10))
    d.polygon([(x + w * .16, y + h * .08), (x + w * .84, y + h * .08),
               (x + w * .72, y + h * .58), (x + w * .28, y + h * .58)], fill=255)
    d.ellipse([x + w * .28, y + h * .46, x + w * .72, y + h * .70], fill=255)
    d.rectangle([x + w * .45, y + h * .62, x + w * .55, y + h * .86], fill=255)
    d.rounded_rectangle([x + w * .24, y + h * .82, x + w * .76, y + h * .98],
                        radius=int(w * .05), fill=255)


def jeton(d, s):
    """Jeton : pièce ronde avec une étoile en creux, bord cranté."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .04, y + h * .04, x + w * .96, y + h * .96], fill=255)
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = .26 if i % 2 == 0 else .11
        pts.append((x + w * (.5 + r * math.cos(a)), y + h * (.5 + r * math.sin(a))))
    d.polygon(pts, outline=0, width=int(w * .05))


# ══════════════════════ OUTILS / MODÉRATION ══════════════════════
def marteau(d, s):
    """Marteau : manche en diagonale, tête massive posée en travers."""
    x, y, w, h = _box(s)
    ep = int(w * .15)
    # manche
    d.line([(x + w * .26, y + h * .98), (x + w * .60, y + h * .42)], fill=255, width=ep)
    d.ellipse([x + w * .26 - ep / 2, y + h * .98 - ep / 2,
               x + w * .26 + ep / 2, y + h * .98 + ep / 2], fill=255)
    # tête
    eph = int(w * .26)
    d.line([(x + w * .34, y + h * .22), (x + w * .90, y + h * .44)], fill=255, width=eph)
    for cx, cy in ((.34, .22), (.90, .44)):
        d.ellipse([x + w * cx - eph / 2, y + h * cy - eph / 2,
                   x + w * cx + eph / 2, y + h * cy + eph / 2], fill=255)


def radar(d, s):
    """Radar : deux anneaux + balayage en éventail depuis le centre."""
    x, y, w, h = _box(s)
    e = int(w * .075)
    d.ellipse([x + w * .04, y + h * .04, x + w * .96, y + h * .96], outline=255, width=e)
    d.ellipse([x + w * .26, y + h * .26, x + w * .74, y + h * .74], outline=255, width=e)
    cx, cy = x + w * .5, y + h * .5
    d.pieslice([cx - w * .46, cy - h * .46, cx + w * .46, cy + h * .46], 296, 348, fill=255)
    d.ellipse([x + w * .42, y + h * .42, x + w * .58, y + h * .58], fill=255)


def empreinte(d, s):
    """Empreinte : arcs concentriques ouverts (crêtes du doigt)."""
    x, y, w, h = _box(s)
    e = int(w * .075)
    cx, cy = x + w * .5, y + h * .52
    for r in (.13, .25, .37, .49):
        d.arc([cx - w * r, cy - h * r * 1.15, cx + w * r, cy + h * r * 1.15],
              200, 340, fill=255, width=e)


# ══════════════════════ ARGENT / PAPIERS ══════════════════════
def billet_ticket(d, s):
    """Ticket : rectangle à encoches (haut et bas) + talon pointillé."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .04, y + h * .22, x + w * .96, y + h * .78],
                        radius=int(w * .07), fill=255)
    d.ellipse([x + w * .56, y + h * .14, x + w * .68, y + h * .30], fill=0)
    d.ellipse([x + w * .56, y + h * .70, x + w * .68, y + h * .86], fill=0)


def billets(d, s):
    """Deux billets superposés, légèrement décalés."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .16, y + h * .10, x + w * .94, y + h * .46],
                        radius=int(w * .05), fill=255)
    d.rounded_rectangle([x + w * .04, y + h * .44, x + w * .88, y + h * .88],
                        radius=int(w * .05), fill=255)


def carte_bancaire(d, s):
    """Carte : format paysage, puce en haut à gauche, piste magnétique."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .03, y + h * .22, x + w * .97, y + h * .78],
                        radius=int(w * .08), fill=255)
    d.rounded_rectangle([x + w * .12, y + h * .34, x + w * .34, y + h * .46],
                        radius=int(w * .02), fill=0)
    d.rectangle([x + w * .12, y + h * .58, x + w * .60, y + h * .64], fill=0)


def fil(d, s):
    """Fil de discussion : ligne souple épaisse avec deux points d'accroche."""
    x, y, w, h = _box(s)
    pts = []
    for i in range(25):
        t = i / 24
        pts.append((x + w * (.06 + .88 * t), y + h * (.5 + .30 * math.sin(t * 2 * math.pi))))
    d.line(pts, fill=255, width=int(w * .13), joint='curve')
    for cx, cy in (pts[0], pts[-1]):
        d.ellipse([cx - w * .08, cy - w * .08, cx + w * .08, cy + w * .08], fill=255)


# ══════════════════════ GAMING ══════════════════════
def joystick_v2(d, s):
    """Manche arcade : boule, tige, socle ovale."""
    x, y, w, h = _box(s)
    d.ellipse([x + w * .34, y + h * .02, x + w * .66, y + h * .30], fill=255)
    d.rectangle([x + w * .45, y + h * .22, x + w * .55, y + h * .72], fill=255)
    d.ellipse([x + w * .12, y + h * .62, x + w * .88, y + h * .96], fill=255)


# ══════════════════════ IDENTITÉ ══════════════════════
def carte_identite(d, s):
    """Carte d'identité : photo ronde, lignes d'état civil."""
    x, y, w, h = _box(s)
    d.rounded_rectangle([x + w * .03, y + h * .16, x + w * .97, y + h * .84],
                        radius=int(w * .08), fill=255)
    d.ellipse([x + w * .12, y + h * .32, x + w * .36, y + h * .56], fill=0)
    d.pieslice([x + w * .10, y + h * .48, x + w * .38, y + h * .78], 180, 360, fill=0)
    for i, cy in enumerate((.34, .48, .62)):
        d.rectangle([x + w * .46, y + h * cy, x + w * (.88 - i * .10), y + h * (cy + .07)],
                    fill=0)


# ══════════════════════ PREMIUM ══════════════════════
def licorne(d, s):
    """Tête de licorne de profil : museau, oreille, corne pointue."""
    x, y, w, h = _box(s)
    d.polygon([
        (x + w * .14, y + h * .98), (x + w * .24, y + h * .60),
        (x + w * .32, y + h * .36), (x + w * .50, y + h * .24),
        (x + w * .72, y + h * .32), (x + w * .88, y + h * .46),
        (x + w * .94, y + h * .58), (x + w * .72, y + h * .64),
        (x + w * .64, y + h * .78), (x + w * .58, y + h * .98),
    ], fill=255)
    d.polygon([(x + w * .38, y + h * .30), (x + w * .40, y + h * .08),
               (x + w * .52, y + h * .26)], fill=255)
    d.polygon([(x + w * .54, y + h * .28), (x + w * .74, y - h * .02),
               (x + w * .70, y + h * .32)], fill=255)
