"""tools/emotes/render.py — fabrique les emotes (PNG statiques + GIF animés).

Usage :
    python3 -m tools.emotes.render --tout          # toute la bibliothèque
    python3 -m tools.emotes.render --test 12       # échantillon pour vérifier
"""
import argparse
import importlib
import json
import math
import os
import re
import sys
import unicodedata
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

if __package__ in (None, ''):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from tools.emotes import engine
    from tools.emotes import shapes as S1, shapes2 as S2, shapes3 as S3
    from tools.emotes import shapes4 as S4, shapes5 as S5, shapes6 as S6
    from tools.emotes import shapes7 as S7
    from tools.emotes import shapes8 as S8
    from tools.emotes.catalog import E, CATEGORIES
else:
    from . import engine
    from . import shapes as S1, shapes2 as S2, shapes3 as S3
    from . import shapes4 as S4, shapes5 as S5, shapes6 as S6
    from . import shapes7 as S7
    from . import shapes8 as S8
    from .catalog import E, CATEGORIES

DOSSIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'emotes')
W = engine.W
OUT = engine.OUT


def forme(nom):
    for mod in (S8, S7, S6, S5, S4, S3, S2, S1):   # le dernier module gagne
        f = getattr(mod, nom, None)
        if callable(f):
            return f
    raise KeyError('forme inconnue : ' + nom)


def propre(nom):
    """Nom d'emoji valide pour Discord : [a-z0-9_] uniquement."""
    sans = unicodedata.normalize('NFKD', nom).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9_]', '_', sans.lower())


# ─────────────────────────── ornements ───────────────────────────
def ornement(nom, theme):
    """Petit symbole posé sur l'objet (renvoie une couche RGBA)."""
    if not nom:
        return None
    img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = W * 0.5, W * 0.5
    blanc = (255, 255, 255, 255)
    e = int(W * 0.05)

    def trace(points, couleur, largeur):
        for i in range(len(points) - 1):
            d.line([points[i], points[i + 1]], fill=couleur, width=largeur)
            for p in (points[i], points[i + 1]):
                d.ellipse([p[0] - largeur / 2, p[1] - largeur / 2,
                           p[0] + largeur / 2, p[1] + largeur / 2], fill=couleur)

    if nom == 'check':
        pts = [(cx - W * .14, cy + W * .01), (cx - W * .04, cy + W * .11), (cx + W * .15, cy - W * .11)]
        trace(pts, theme.contour + (255,), e * 2)
        trace(pts, blanc, e)
    elif nom == 'croix':
        for dx in (-1, 1):
            pts = [(cx - W * .09, cy + W * .09 * dx), (cx + W * .09, cy - W * .09 * dx)]
            trace(pts, theme.contour + (255,), e * 2)
            trace(pts, blanc, e)
    elif nom == 'bang':
        trace([(cx, cy - W * .12), (cx, cy + W * .04)], theme.contour + (255,), e * 2)
        trace([(cx, cy - W * .12), (cx, cy + W * .04)], blanc, e)
        d.ellipse([cx - e, cy + W * .07, cx + e, cy + W * .09 + e], fill=theme.contour + (255,))
        d.ellipse([cx - e * .6, cy + W * .075, cx + e * .6, cy + W * .085 + e * .6], fill=blanc)
    elif nom == 'etoile':
        pts = []
        for i in range(10):
            a = -math.pi / 2 + i * math.pi / 5
            r = W * .12 if i % 2 == 0 else W * .05
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        d.polygon(pts, fill=theme.contour + (255,))
        pts2 = [(cx + (x - cx) * .78, cy + (y - cy) * .78) for x, y in pts]
        d.polygon(pts2, fill=blanc)
    elif nom == 'joyau':
        d.polygon([(cx, cy - W * .12), (cx + W * .10, cy), (cx, cy + W * .12), (cx - W * .10, cy)],
                  fill=theme.contour + (255,))
        d.polygon([(cx, cy - W * .09), (cx + W * .075, cy), (cx, cy + W * .09), (cx - W * .075, cy)],
                  fill=(255, 255, 255, 255))
    elif nom == 'fleche':
        d.polygon([(cx, cy - W * .13), (cx + W * .11, cy), (cx + W * .04, cy),
                   (cx + W * .04, cy + W * .13), (cx - W * .04, cy + W * .13),
                   (cx - W * .04, cy), (cx - W * .11, cy)], fill=theme.contour + (255,))
        d.polygon([(cx, cy - W * .10), (cx + W * .08, cy), (cx + W * .03, cy),
                   (cx + W * .03, cy + W * .10), (cx - W * .03, cy + W * .10),
                   (cx - W * .03, cy), (cx - W * .08, cy)], fill=(255, 255, 255, 255))
    elif nom == 'points':
        for dx, dy in ((-.08, -.03), (.08, -.03), (0, .09)):
            d.ellipse([cx + W * dx - e, cy + W * dy - e, cx + W * dx + e, cy + W * dy + e],
                      fill=theme.contour + (255,))
            d.ellipse([cx + W * dx - e * .6, cy + W * dy - e * .6,
                       cx + W * dx + e * .6, cy + W * dy + e * .6], fill=(255, 255, 255, 255))
    return img


# ─────────────────────────── rendu d'une emote ───────────────────────────
# Arêtes internes (coordonnées relatives) : effet pierre taillée
ARETES = {
    'gemme_ovale': [[(0.50, 0.01), (0.50, 0.99)],
                    [(0.01, 0.50), (0.99, 0.50)],
                    [(0.16, 0.13), (0.84, 0.87)],
                    [(0.84, 0.13), (0.16, 0.87)],
                    [(0.16, 0.13), (0.84, 0.13)],
                    [(0.16, 0.87), (0.84, 0.87)]],
    'gemme_table': [[(0.30, 0.02), (0.30, 0.62)], [(0.70, 0.02), (0.70, 0.62)],
                    [(0.04, 0.30), (0.96, 0.30)],
                    [(0.04, 0.62), (0.50, 0.99), (0.96, 0.62)],
                    [(0.04, 0.30), (0.30, 0.02)], [(0.96, 0.30), (0.70, 0.02)]],
    'gemme_emeraude': [[(0.22, 0.04), (0.22, 0.96)], [(0.78, 0.04), (0.78, 0.96)],
                       [(0.04, 0.26), (0.96, 0.26)], [(0.04, 0.74), (0.96, 0.74)],
                       [(0.22, 0.04), (0.78, 0.96)], [(0.78, 0.04), (0.22, 0.96)]],
    'cristal': [[(0.50, 0.00), (0.50, 0.92)],
                [(0.20, 0.30), (0.80, 0.30)],
                [(0.20, 0.30), (0.30, 0.92)], [(0.80, 0.30), (0.70, 0.92)],
                [(0.50, 0.00), (0.20, 0.30)], [(0.50, 0.00), (0.80, 0.30)]],
    'diamant_brillant': [[(0.13, 0.34), (0.87, 0.34)],
                         [(0.30, 0.03), (0.23, 0.34)], [(0.70, 0.03), (0.77, 0.34)],
                         [(0.50, 0.03), (0.50, 0.34)],
                         [(0.13, 0.34), (0.50, 0.99), (0.87, 0.34)],
                         [(0.31, 0.34), (0.50, 0.99)], [(0.69, 0.34), (0.50, 0.99)]],
    'diamant_premium': [[(0.06, 0.40), (0.94, 0.40)],
                        [(0.26, 0.04), (0.18, 0.40)], [(0.74, 0.04), (0.82, 0.40)],
                        [(0.50, 0.40), (0.50, 0.98)],
                        [(0.06, 0.40), (0.50, 0.98), (0.94, 0.40)]],
    'diamant': [[(0.04, 0.36), (0.96, 0.36)], [(0.22, 0.04), (0.50, 0.98)],
                [(0.78, 0.04), (0.50, 0.98)], [(0.50, 0.04), (0.50, 0.98)]],
    'amas_gemmes': [[(0.50, 0.02), (0.50, 0.74)], [(0.22, 0.34), (0.78, 0.34)]],
    'lingot_or': [[(0.10, 0.56), (0.30, 0.26)], [(0.98, 0.26), (0.88, 0.96)],
                  [(0.10, 0.56), (0.88, 0.56)]],
    'bouclier': [[(0.50, 0.01), (0.50, 0.99)], [(0.03, 0.36), (0.97, 0.36)]],
    'niveau': [[(0.04, 0.28), (0.96, 0.72)], [(0.04, 0.72), (0.96, 0.28)]],
    'piece': [[(0.50, 0.02), (0.50, 0.98)], [(0.02, 0.50), (0.98, 0.50)]],
    'medaille': [[(0.50, 0.34), (0.50, 1.00)], [(0.12, 0.67), (0.88, 0.67)]],
    'boulon': [[(0.50, 0.02), (0.50, 0.98)], [(0.02, 0.50), (0.98, 0.50)]],
}

# Aiguilles de l'horloge : dessinées à part pour pouvoir les faire tourner.
AIGUILLE_HEURE = (0.50, 0.50, 0.62, 0.56)   # x1, y1, x2, y2 (relative)
AIGUILLE_MINUTE = (0.50, 0.50, 0.50, 0.24)


# ─────────────── détails (yeux, nez, bouche, motifs) ───────────────
# op : ('cercle', cx, cy, r, 'sombre'|'clair'|'accent')
#      ('poly',  [(x,y),...], couleur)
#      ('trait', [(x,y),...], epaisseur, couleur)
DETAILS = {
    'boite_archive': [('trait', [(0.26, 0.34), (0.74, 0.34)], 7, 'sombre'),
                      ('trait', [(0.42, 0.66), (0.58, 0.66)], 9, 'sombre')],
    'de': [('cercle', 0.32, 0.32, 0.065, 'sombre'), ('cercle', 0.68, 0.32, 0.065, 'sombre'),
           ('cercle', 0.50, 0.50, 0.065, 'sombre'), ('cercle', 0.32, 0.68, 0.065, 'sombre'),
           ('cercle', 0.68, 0.68, 0.065, 'sombre')],
    'horloge': [('trait', [(0.50, 0.50), (0.50, 0.24)], 7, 'sombre'),
                ('trait', [(0.50, 0.50), (0.62, 0.56)], 9, 'sombre'),
                ('cercle', 0.50, 0.50, 0.030, 'clair')],
    'chat': [('poly', [(0.36, 0.46), (0.44, 0.46), (0.40, 0.52)], 'sombre'),
             ('poly', [(0.56, 0.46), (0.64, 0.46), (0.60, 0.52)], 'sombre'),
             ('poly', [(0.46, 0.58), (0.54, 0.58), (0.50, 0.63)], 'sombre'),
             ('trait', [(0.44, 0.66), (0.50, 0.70), (0.56, 0.66)], 6, 'sombre')],
    'chien': [('cercle', 0.40, 0.50, 0.045, 'sombre'),
              ('cercle', 0.60, 0.50, 0.045, 'sombre'),
              ('poly', [(0.43, 0.62), (0.57, 0.62), (0.50, 0.68)], 'sombre'),
              ('trait', [(0.44, 0.72), (0.50, 0.76), (0.56, 0.72)], 6, 'sombre')],
    'renard': [('cercle', 0.40, 0.48, 0.045, 'sombre'),
               ('cercle', 0.60, 0.48, 0.045, 'sombre'),
               ('poly', [(0.44, 0.60), (0.56, 0.60), (0.50, 0.66)], 'sombre')],
    'panda': [('cercle', 0.40, 0.50, 0.055, 'sombre'),
              ('cercle', 0.60, 0.50, 0.055, 'sombre'),
              ('poly', [(0.45, 0.62), (0.55, 0.62), (0.50, 0.67)], 'sombre'),
              ('trait', [(0.42, 0.72), (0.50, 0.76), (0.58, 0.72)], 6, 'sombre')],
    'lapin': [('cercle', 0.40, 0.48, 0.045, 'sombre'),
              ('cercle', 0.60, 0.48, 0.045, 'sombre'),
              ('poly', [(0.45, 0.60), (0.55, 0.60), (0.50, 0.65)], 'sombre')],
    'ours': [('cercle', 0.40, 0.48, 0.045, 'sombre'),
             ('cercle', 0.60, 0.48, 0.045, 'sombre'),
             ('cercle', 0.50, 0.62, 0.06, 'clair'),
             ('poly', [(0.46, 0.60), (0.54, 0.60), (0.50, 0.65)], 'sombre')],
    'loup': [('poly', [(0.35, 0.46), (0.45, 0.49), (0.35, 0.52)], 'sombre'),
             ('poly', [(0.65, 0.46), (0.55, 0.49), (0.65, 0.52)], 'sombre'),
             ('poly', [(0.44, 0.60), (0.56, 0.60), (0.50, 0.66)], 'sombre')],
    'licorne': [('cercle', 0.62, 0.44, 0.050, 'sombre'),
                ('cercle', 0.84, 0.52, 0.030, 'sombre')],
    'grenouille': [('cercle', 0.28, 0.40, 0.05, 'sombre'),
                   ('cercle', 0.72, 0.40, 0.05, 'sombre'),
                   ('trait', [(0.38, 0.66), (0.50, 0.74), (0.62, 0.66)], 7, 'sombre')],
    'pingouin': [('cercle', 0.40, 0.42, 0.045, 'sombre'),
                 ('cercle', 0.60, 0.42, 0.045, 'sombre'),
                 ('poly', [(0.44, 0.52), (0.56, 0.52), (0.50, 0.58)], 'accent')],
    'abeille': [('cercle', 0.34, 0.48, 0.04, 'sombre'),
                ('cercle', 0.52, 0.48, 0.04, 'sombre'),
                ('trait', [(0.26, 0.38), (0.30, 0.64)], 10, 'sombre'),
                ('trait', [(0.44, 0.38), (0.48, 0.64)], 10, 'sombre')],
    'papillon': [('cercle', 0.50, 0.30, 0.035, 'sombre'),
                 ('cercle', 0.28, 0.28, 0.05, 'sombre'),
                 ('cercle', 0.72, 0.28, 0.05, 'sombre')],
    'patte': [('cercle', 0.28, 0.68, 0.09, 'sombre'),
              ('cercle', 0.20, 0.42, 0.07, 'sombre'),
              ('cercle', 0.38, 0.40, 0.07, 'sombre'),
              ('cercle', 0.56, 0.40, 0.07, 'sombre'),
              ('cercle', 0.72, 0.44, 0.07, 'sombre')],
    'poisson': [('cercle', 0.24, 0.44, 0.045, 'sombre'),
                ('trait', [(0.30, 0.62), (0.46, 0.66)], 6, 'sombre')],
    'oiseau': [('cercle', 0.30, 0.44, 0.045, 'sombre'),
               ('poly', [(0.62, 0.50), (0.74, 0.56), (0.62, 0.60)], 'sombre')],
    'smiley': [('cercle', 0.34, 0.40, 0.085, 'sombre'),
               ('cercle', 0.66, 0.40, 0.085, 'sombre'),
               ('trait', [(0.28, 0.60), (0.50, 0.74), (0.72, 0.60)], 12, 'sombre')],
    'smiley_rieur': [('poly', [(0.24, 0.44), (0.46, 0.36), (0.46, 0.52)], 'sombre'),
                     ('poly', [(0.76, 0.44), (0.54, 0.36), (0.54, 0.52)], 'sombre'),
                     ('trait', [(0.26, 0.62), (0.50, 0.78), (0.74, 0.62)], 12, 'sombre')],
    'robot': [('cercle', 0.33, 0.56, 0.06, 'sombre'),
              ('cercle', 0.67, 0.56, 0.06, 'sombre'),
              ('trait', [(0.36, 0.72), (0.64, 0.72)], 10, 'sombre')],
    'fantome': [('cercle', 0.36, 0.46, 0.055, 'sombre'),
                ('cercle', 0.64, 0.46, 0.055, 'sombre'),
                ('cercle', 0.50, 0.62, 0.055, 'sombre')],
    'diable': [('poly', [(0.30, 0.46), (0.44, 0.50), (0.30, 0.54)], 'sombre'),
               ('poly', [(0.70, 0.46), (0.56, 0.50), (0.70, 0.54)], 'sombre'),
               ('trait', [(0.34, 0.66), (0.50, 0.74), (0.66, 0.66)], 8, 'sombre')],
    'zombie': [('trait', [(0.26, 0.48), (0.44, 0.52)], 8, 'sombre'),
               ('trait', [(0.56, 0.52), (0.74, 0.48)], 8, 'sombre'),
               ('trait', [(0.36, 0.70), (0.64, 0.70)], 8, 'sombre')],
    'masque': [('poly', [(0.26, 0.50), (0.42, 0.44), (0.42, 0.56)], 'sombre'),
               ('poly', [(0.74, 0.50), (0.58, 0.44), (0.58, 0.56)], 'sombre'),
               ('trait', [(0.40, 0.70), (0.50, 0.74), (0.60, 0.70)], 8, 'sombre')],
    'ange': [('cercle', 0.43, 0.46, 0.042, 'sombre'),
             ('cercle', 0.57, 0.46, 0.042, 'sombre')],
    'oeil': [('cercle', 0.50, 0.50, 0.16, 'accent'),
             ('cercle', 0.50, 0.50, 0.09, 'sombre'),
             ('cercle', 0.44, 0.44, 0.03, 'clair')],
    'personne': [('cercle', 0.30, 0.26, 0.045, 'clair')],
    'groupe': [('cercle', 0.30, 0.22, 0.035, 'clair')],
    'piece': [('cercle', 0.50, 0.50, 0.13, 'accent'),
              ('cercle', 0.50, 0.50, 0.09, 'sombre')],
    'coffre': [('cercle', 0.50, 0.50, 0.06, 'sombre'),
               ('trait', [(0.50, 0.56), (0.50, 0.68)], 8, 'sombre')],
    'cadenas': [('cercle', 0.50, 0.72, 0.055, 'sombre'),
                ('trait', [(0.50, 0.72), (0.50, 0.82)], 9, 'sombre')],
    'enveloppe': [('poly', [(0.06, 0.24), (0.50, 0.58), (0.94, 0.24)], 'sombre')],
    'bombe': [('trait', [(0.34, 0.50), (0.66, 0.70)], 9, 'sombre')],
    'bombe_fun': [('poly', [(0.50, 0.42), (0.62, 0.58), (0.50, 0.74), (0.38, 0.58)], 'sombre')],
    'maison': [('poly', [(0.50, 0.46), (0.62, 0.62), (0.62, 0.86), (0.38, 0.86), (0.38, 0.62)], 'sombre')],
    'cadeau': [('trait', [(0.50, 0.30), (0.50, 0.96)], 9, 'sombre')],
    'fusee': [('cercle', 0.50, 0.40, 0.10, 'clair')],
    'fusee_sys': [('cercle', 0.50, 0.34, 0.10, 'clair')],
    'casque': [('trait', [(0.28, 0.62), (0.28, 0.74)], 10, 'clair'),
               ('trait', [(0.72, 0.62), (0.72, 0.74)], 10, 'clair')],
    'livre': [('trait', [(0.50, 0.12), (0.50, 0.88)], 8, 'sombre')],
    'document': [('trait', [(0.24, 0.40), (0.76, 0.40)], 7, 'sombre'),
                 ('trait', [(0.24, 0.56), (0.76, 0.56)], 7, 'sombre'),
                 ('trait', [(0.24, 0.72), (0.62, 0.72)], 7, 'sombre')],
    'parchemin': [('trait', [(0.24, 0.38), (0.76, 0.38)], 6, 'sombre'),
                  ('trait', [(0.24, 0.58), (0.68, 0.58)], 6, 'sombre')],
    'ampoule': [('trait', [(0.42, 0.62), (0.58, 0.62)], 8, 'sombre')],
    'batterie': [('poly', [(0.30, 0.62), (0.44, 0.50), (0.44, 0.62)], 'sombre'),
                 ('poly', [(0.56, 0.62), (0.70, 0.50), (0.70, 0.62)], 'sombre')],
    'serveur': [('trait', [(0.24, 0.30), (0.36, 0.30)], 9, 'accent'),
                ('trait', [(0.24, 0.60), (0.36, 0.60)], 9, 'accent'),
                ('trait', [(0.24, 0.90), (0.36, 0.90)], 9, 'accent')],
    'sablier': [('poly', [(0.50, 0.44), (0.66, 0.40), (0.34, 0.40)], 'accent')],
    'boussole': [('cercle', 0.50, 0.50, 0.05, 'clair')],
    'globe': [('trait', [(0.06, 0.50), (0.94, 0.50)], 8, 'sombre'),
              ('trait', [(0.50, 0.06), (0.50, 0.94)], 8, 'sombre')],
    'anneau': [('cercle', 0.50, 0.50, 0.10, 'sombre')],
    'oeil_rieur': [('trait', [(0.30, 0.52), (0.50, 0.72), (0.70, 0.52)], 9, 'sombre')],
    'crane': [('cercle', 0.34, 0.34, 0.05, 'sombre'),
              ('cercle', 0.66, 0.34, 0.05, 'sombre')],
    'crane': [('ellipse', 0.36, 0.46, 0.10, 0.13, 'sombre'),
              ('ellipse', 0.64, 0.46, 0.10, 0.13, 'sombre'),
              ('poly', [(0.47, 0.62), (0.53, 0.62), (0.50, 0.68)], 'sombre')],
    'eclair': [('poly', [(0.52, 0.14), (0.36, 0.50), (0.46, 0.50), (0.40, 0.84)], 'clair')],
    'masque_theatre': [('poly', [(0.26, 0.42), (0.44, 0.36), (0.44, 0.50)], 'sombre'),
                       ('poly', [(0.74, 0.42), (0.56, 0.36), (0.56, 0.50)], 'sombre'),
                       ('trait', [(0.34, 0.66), (0.50, 0.78), (0.66, 0.66)], 10, 'sombre')],
    'manette_v2': [('trait', [(0.24, 0.42), (0.24, 0.56)], 12, 'sombre'),
                   ('trait', [(0.16, 0.49), (0.32, 0.49)], 12, 'sombre'),
                   ('cercle', 0.72, 0.44, 0.05, 'sombre'),
                   ('cercle', 0.84, 0.54, 0.05, 'sombre')],
    'joystick_v2': [('cercle', 0.50, 0.22, 0.07, 'clair')],
    'fusee_v2': [('cercle', 0.50, 0.36, 0.09, 'clair')],
    'cotillon': [('trait', [(0.18, 0.84), (0.34, 0.62)], 8, 'clair')],
    'zombie_tete': [('cercle', 0.34, 0.34, 0.05, 'sombre'),
                    ('cercle', 0.66, 0.34, 0.05, 'sombre')],
    'coeur_brisе': [('poly', [(0.50, 0.20), (0.42, 0.48), (0.56, 0.62), (0.46, 0.92)], 'clair')],
}


def appliquer_details(img, nom_forme, theme):
    """Dessine les yeux / nez / bouche par-dessus la peinture."""
    ops = DETAILS.get(nom_forme)
    if not ops:
        ops = DETAILS.get(nom_forme.replace('е', 'e'))
    if not ops:
        return img
    couche = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(couche)

    def couleur(nom):
        if nom == 'sombre':
            return tuple(int(c * 0.42) for c in theme.contour) + (255,)
        if nom == 'clair':
            return (255, 255, 255, 235)
        return tuple(int(c) for c in theme.accent) + (255,)

    for op in ops:
        if op[0] == 'cercle':
            _, cx, cy, r, col = op
            d.ellipse([W * (cx - r), W * (cy - r), W * (cx + r), W * (cy + r)], fill=couleur(col))
        elif op[0] == 'poly':
            _, pts, col = op
            d.polygon([(W * x, W * y) for x, y in pts], fill=couleur(col))
        elif op[0] == 'ellipse':
            _, cx, cy, rx, ry, col = op
            d.ellipse([W * (cx - rx), W * (cy - ry), W * (cx + rx), W * (cy + ry)], fill=couleur(col))
        elif op[0] == 'trait':
            _, pts, ep, col = op
            d.line([(W * x, W * y) for x, y in pts], fill=couleur(col), width=max(2, int(W * ep / 400)), joint='curve')
    return Image.alpha_composite(img, couche)


def rendre_base(cle, nom_forme, nom_theme, orn, avec_details=True):
    th = engine.THEMES[nom_theme]
    dessin = forme(nom_forme)
    masque = engine.masque(dessin, (W, W))
    if masque.getbbox() is None:
        raise ValueError('forme vide : ' + nom_forme)
    corps = engine.composer(masque, th)
    if nom_forme in ARETES:
        interieur = masque.filter(ImageFilter.MinFilter(9))
        facettes = engine.aretes(interieur, ARETES[nom_forme], th)
        corps = Image.alpha_composite(corps, facettes)
    if avec_details:
        corps = appliquer_details(corps, nom_forme, th)
    deco = ornement(orn, th)
    halo = engine.glow_nuage((W, W), th.accent, intensite=0.42, rayon=0.40)
    return engine.superposer(halo, corps, deco)


def etincelles_autour(n=3, rayon=0.40, angle0=0.0, couleur=(255, 255, 255), taille=0.11):
    couche = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    for i in range(n):
        a = angle0 + i * 2 * math.pi / n
        cx = W * .5 + math.cos(a) * W * rayon
        cy = W * .5 + math.sin(a) * W * rayon
        t = int(W * taille)
        e = engine.etincelle(t, couleur)
        couche.alpha_composite(e, (int(cx - t / 2), int(cy - t / 2)))
    return couche


def transformer(img, echelle=1.0, rotation=0.0, dx=0, dy=0, ecrasement=1.0):
    """Applique une transformation en gardant le canevas carré."""
    base = img
    if rotation:
        base = base.rotate(rotation, resample=Image.BICUBIC, center=(W / 2, W / 2))
    if ecrasement != 1.0:
        base = base.resize((max(1, int(W * ecrasement)), W), Image.LANCZOS)
        neuf = Image.new('RGBA', (W, W), (0, 0, 0, 0))
        neuf.alpha_composite(base, (int((W - base.width) / 2), 0))
        base = neuf
    if echelle != 1.0:
        cote = max(1, int(W * echelle))
        base = base.resize((cote, cote), Image.LANCZOS)
        neuf = Image.new('RGBA', (W, W), (0, 0, 0, 0))
        neuf.alpha_composite(base, (int((W - cote) / 2) + dx, int((W - cote) / 2) + dy))
        base = neuf
    elif dx or dy:
        neuf = Image.new('RGBA', (W, W), (0, 0, 0, 0))
        neuf.alpha_composite(base, (dx, dy))
        base = neuf
    return base


def _calque():
    return Image.new('RGBA', (W, W), (0, 0, 0, 0))


def _pinceau(theme):
    """Couleurs d'accent pour les calques animés."""
    a = tuple(int(c) for c in theme.accent)
    c = tuple(int(c * 0.55) for c in theme.contour)
    return a, c


def _bande_lumiere(alpha_img, position, largeur=0.20, force=0.9):
    """Reflet métallique : bande diagonale claire qui balaie l'objet."""
    x = np.arange(W)[None, :] / W
    y = np.arange(W)[:, None] / W
    d = (x + y * 0.55) - position
    bande = np.exp(-(d ** 2) / (2 * (largeur ** 2)))
    lum = (bande * force * 255).astype(np.uint8)
    reflet = np.zeros((W, W, 4), dtype=np.uint8)
    reflet[..., 0] = reflet[..., 1] = reflet[..., 2] = 255
    alpha = np.asarray(alpha_img.convert('L'), dtype=np.float32) / 255.0
    reflet[..., 3] = (lum.astype(np.float32) * alpha).astype(np.uint8)
    return Image.fromarray(reflet, 'RGBA')


def _aiguilles(theme, angle_min, angle_heure):
    """Aiguilles d'horloge (calque séparé pour pouvoir les faire tourner)."""
    a, c = _pinceau(theme)
    couche = _calque()
    d = ImageDraw.Draw(couche)
    cx, cy = W * 0.5, W * 0.5
    for longueur, angle, ep in ((W * 0.26, angle_min, W * 0.035),
                                (W * 0.17, angle_heure, W * 0.045)):
        dx = math.sin(math.radians(angle)) * longueur
        dy = -math.cos(math.radians(angle)) * longueur
        d.line([(cx, cy), (cx + dx, cy + dy)], fill=c + (255,), width=int(ep * 1.7))
        d.line([(cx, cy), (cx + dx, cy + dy)], fill=(255, 255, 255, 245), width=int(ep))
    r = W * 0.045
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c + (255,))
    d.ellipse([cx - r * .6, cy - r * .6, cx + r * .6, cy + r * .6], fill=(255, 255, 255, 255))
    return couche


def _sable(theme, t):
    """Sablier : grains qui tombent et tas qui grossit en bas."""
    a, c = _pinceau(theme)
    couche = _calque()
    d = ImageDraw.Draw(couche)
    colonne = W * 0.5
    haut, bas = W * 0.34, W * 0.74
    for k in range(5):
        p = (t + k / 5) % 1.0
        yy = haut + (bas - haut) * p
        r = W * 0.018
        d.ellipse([colonne - r, yy - r, colonne + r, yy + r], fill=(255, 236, 170, 235))
    # tas du bas qui grossit, tas du haut qui diminue
    hb = W * (0.02 + 0.10 * t)
    d.polygon([(colonne - W * .12, bas + W * .06), (colonne + W * .12, bas + W * .06),
               (colonne, bas + W * .06 - hb)], fill=(255, 226, 150, 230))
    ht = W * (0.10 - 0.08 * t)
    if ht > W * 0.01:
        d.polygon([(colonne - W * .12, haut - W * .04), (colonne + W * .12, haut - W * .04),
                   (colonne, haut - W * .04 + ht)], fill=(255, 226, 150, 230))
    return couche


def _radar(theme, t):
    """Radar : balayage circulaire en éventail avec traînée."""
    a, c = _pinceau(theme)
    couche = _calque()
    d = ImageDraw.Draw(couche)
    cx, cy = W * 0.5, W * 0.62
    rayon = W * 0.36
    for k in range(5):
        ang = math.radians(t * 360 - k * 9)
        opacite = int(240 * (1 - k / 5.5))
        largeur = W * 0.016
        d.line([(cx, cy), (cx + math.cos(ang) * rayon, cy + math.sin(ang) * rayon)],
               fill=(255, 255, 255, opacite), width=int(largeur))
        d.line([(cx, cy), (cx + math.cos(ang) * rayon * 0.98, cy + math.sin(ang) * rayon * 0.98)],
               fill=a + (opacite // 2,), width=int(largeur * 2.4))
    return couche


def _ondes(theme, t):
    """Wi-Fi : les trois ondes s'allument l'une après l'autre."""
    a, c = _pinceau(theme)
    couche = _calque()
    d = ImageDraw.Draw(couche)
    actif = int(t * 3) % 3
    cx, cy = W * 0.5, W * 0.70
    for k in range(3):
        r = W * (0.12 + 0.10 * k)
        if k == actif:                      # onde allumée
            d.arc([cx - r, cy - r, cx + r, cy + r], 202, 338, fill=(255, 255, 255, 250),
                  width=int(W * 0.055))
        else:                               # ondes éteintes, à peine visibles
            d.arc([cx - r, cy - r, cx + r, cy + r], 202, 338, fill=c + (70,),
                  width=int(W * 0.04))
    return couche


def _remplissage(theme, t):
    """Batterie / barre : le niveau monte puis redescend (boucle propre)."""
    a, c = _pinceau(theme)
    couche = _calque()
    d = ImageDraw.Draw(couche)
    p = t if t <= 0.5 else 1 - t          # 0 → 1 → 0
    x0, x1 = W * 0.20, W * 0.80
    y0, y1 = W * 0.44, W * 0.58
    d.rounded_rectangle([x0, y0, x0 + (x1 - x0) * p, y1], radius=int(W * 0.02),
                        fill=(255, 255, 255, 225))
    return couche


def _faisceau(theme, t):
    """Gyrophare : faisceau lumineux qui tourne au-dessus du dôme."""
    a, c = _pinceau(theme)
    couche = _calque()
    d = ImageDraw.Draw(couche)
    cx, cy = W * 0.5, W * 0.46
    for k in range(3):
        ang = math.radians(t * 360 - k * 12)
        long = W * 0.46
        x2 = cx + math.cos(ang) * long
        y2 = cy + math.sin(ang) * long * 0.45
        d.polygon([(cx, cy), (x2 - math.sin(ang) * W * .11, y2 + math.cos(ang) * W * .06),
                   (x2 + math.sin(ang) * W * .11, y2 - math.cos(ang) * W * .06)],
                  fill=(255, 255, 255, int(210 * (1 - k / 4))) if k == 0 else a + (int(120 * (1 - k / 3)),))
    return couche


def _vacillement(base, theme, t):
    """Flamme : elle ondule, s'étire et faiblit légèrement."""
    k = 1 + 0.05 * math.sin(t * 2 * math.pi) + 0.02 * math.sin(t * 6 * math.pi)
    dx = int(W * 0.012 * math.sin(t * 4 * math.pi))
    f = transformer(base, ecrasement=1 / k, echelle=k, dx=dx)
    f = ImageEnhance.Brightness(f).enhance(0.94 + 0.12 * (0.5 + 0.5 * math.sin(t * 4 * math.pi)))
    return f


def _flash(base, theme, t):
    """Éclair : deux éclats brefs (grossit + blanc) puis retour au calme."""
    p = (t * 2) % 1.0
    intensite = min(1.0, math.exp(-((p - 0.08) ** 2) / 0.004)
                    + 0.7 * math.exp(-((p - 0.34) ** 2) / 0.006))
    f = transformer(base, echelle=1 + 0.12 * intensite)
    f = ImageEnhance.Brightness(f).enhance(1 + 0.9 * intensite)
    halo = engine.glow_nuage((W, W), theme.accent, intensite=0.30 + 0.9 * intensite, rayon=0.48)
    f = Image.alpha_composite(halo, f)
    if intensite > 0.45:                       # cœur blanc au pic de l'éclair
        blanc = _calque()
        d = ImageDraw.Draw(blanc)
        a = int(200 * (intensite - 0.45) / 0.55)
        d.polygon([(W * .52, W * .08), (W * .30, W * .52), (W * .46, W * .52),
                   (W * .38, W * .92), (W * .70, W * .44), (W * .52, W * .44)], fill=(255, 255, 255, a))
        f = Image.alpha_composite(f, blanc)
    return f


def _battement(base, theme, t):
    """Cœur : deux battements puis repos (rythme cardiaque)."""
    def enveloppe(p):
        if p < 0.10:
            return math.sin(p / 0.10 * math.pi) * 1.0
        if p < 0.22:
            return math.sin((p - 0.10) / 0.12 * math.pi) * 0.55
        return 0.0
    # petits battements continus + deux vrais battements forts :
    # ainsi chaque image diffère (pas de temps mort de 0,8 s)
    k = 1 + 0.15 * enveloppe(t) + 0.03 * math.sin(t * 2 * math.pi)
    return transformer(base, echelle=k)


def _balancement(base, theme, t):
    """Cloche : elle oscille doucement de gauche à droite."""
    return transformer(base, rotation=18 * math.sin(t * 2 * math.pi))


def _rotation_douce(base, theme, t):
    """Clé / boussole : petite rotation d'un quart de tour aller-retour."""
    return transformer(base, rotation=16 * math.sin(t * 2 * math.pi))


def _recherche(base, theme, t):
    """Loupe : elle cherche, petit cercle régulier."""
    return transformer(base, dx=int(W * 0.045 * math.cos(t * 2 * math.pi)),
                       dy=int(W * 0.045 * math.sin(t * 2 * math.pi)))


def _montee(base, theme, t):
    """Flèche de niveau : elle monte puis revient."""
    p = t / 0.6 if t <= 0.6 else max(0.0, (1 - t) / 0.4)
    p = max(0.0, min(1.0, p))
    return transformer(base, dy=int(-W * 0.10 * p), echelle=1 + 0.04 * p)


def _decollage(base, theme, t):
    """Fusée : elle avance vers le haut avec des étincelles derrière."""
    f = transformer(base, dy=int(-W * 0.09 * math.sin(t * math.pi)))
    et = _calque()
    d = ImageDraw.Draw(et)
    for k in range(6):
        p = (t + k / 6) % 1.0
        yy = W * (0.66 + 0.30 * p)
        r = W * (0.045 - 0.032 * p)
        d.ellipse([W * .5 - r, yy - r, W * .5 + r, yy + r],
                  fill=(255, 190, 110, int(235 * (1 - p))))
        d.ellipse([W * .5 - r * .5, yy - r * .5, W * .5 + r * .5, yy + r * .5],
                  fill=(255, 245, 200, int(240 * (1 - p))))
    f = f.copy()
    f.alpha_composite(et)
    return f


def _secousse(base, theme, t):
    """Alerte : secousse nette puis retour au repos."""
    amplitude = W * 0.075 * (1 - t) ** 1.5
    dx = int(amplitude * math.sin(t * 6 * math.pi))
    dy = int(amplitude * 0.5 * math.cos(t * 6 * math.pi))
    f = transformer(base, dx=dx, dy=dy)
    if t < 0.20:                      # premier éclat : un peu plus lumineux
        f = ImageEnhance.Brightness(f).enhance(1.18)
    return f


def _reflet(base, theme, t):
    """Objet métallique : un reflet balaie la surface (verre poli)."""
    alpha = base.split()[3]
    reflet = _bande_lumiere(alpha, position=-0.25 + 1.6 * t, largeur=0.16, force=0.85)
    return Image.alpha_composite(base, reflet)


def _spin_metal(base, theme, t):
    """Pièce / jeton : rotation sur elle-même, tranche plus sombre."""
    ec = abs(math.cos(t * math.pi))
    ec = 0.30 + 0.70 * ec
    f = transformer(base, ecrasement=ec)
    if math.cos(t * math.pi) < 0:
        f = ImageEnhance.Brightness(f).enhance(0.82)
    alpha = f.split()[3]
    reflet = _bande_lumiere(alpha, position=-0.2 + 1.4 * t, largeur=0.12, force=0.7)
    return Image.alpha_composite(f, reflet)


def rendre_frames(base, anim, accent, nom_forme=None, theme=None):
    """Renvoie les frames 128×128 d'une emote animée.

    Principe retenu (comme les emotes animées de Discord) : **une seule chose
    bouge**, avec un mouvement qui correspond à l'objet (aiguilles pour une
    horloge, grains pour un sablier, reflet pour une médaille…), et la boucle
    se referme proprement (dernière frame = un cran avant la première).
    """
    imgs = []
    FR = 16
    th = theme or engine.THEMES['or']

    def simple(f):
        imgs.append(f)

    for i in range(FR):
        t = i / FR
        if anim == 'tic':
            # horloge : la trotteuse avance par crans de 45°, l'heure suit
            crans = 8
            pas = math.floor(t * crans) / crans
            simple(Image.alpha_composite(base, _aiguilles(th, 360 * pas, 30 + 45 * pas / 12)))
        elif anim == 'sable':
            f = base.copy()
            f.alpha_composite(_sable(th, t))
            simple(f)
        elif anim == 'radar':
            f = base.copy()
            f.alpha_composite(_radar(th, t))
            simple(f)
        elif anim == 'ondes':
            f = base.copy()
            f.alpha_composite(_ondes(th, t))
            simple(f)
        elif anim == 'remplissage':
            f = base.copy()
            f.alpha_composite(_remplissage(th, t))
            simple(f)
        elif anim == 'faisceau':
            f = base.copy()
            f.alpha_composite(_faisceau(th, t))
            simple(f)
        elif anim == 'reflet':
            simple(_reflet(base, th, t))
        elif anim == 'spin':
            simple(_spin_metal(base, th, t))
        elif anim == 'vacillement':
            simple(_vacillement(base, th, t))
        elif anim == 'flash':
            simple(_flash(base, th, t))
        elif anim == 'battement':
            simple(_battement(base, th, t))
        elif anim == 'balancement':
            simple(_balancement(base, th, t))
        elif anim == 'rotation_douce':
            simple(_rotation_douce(base, th, t))
        elif anim == 'recherche':
            simple(_recherche(base, th, t))
        elif anim == 'montee':
            simple(_montee(base, th, t))
        elif anim == 'decollage':
            simple(_decollage(base, th, t))
        elif anim == 'secousse':
            simple(_secousse(base, th, t))
        elif anim == 'pulse':
            k = 1 + 0.13 * math.sin(t * 2 * math.pi)
            simple(transformer(base, echelle=k))
        elif anim == 'glow':
            k = 0.5 + 0.5 * math.sin(t * 2 * math.pi)
            f = ImageEnhance.Brightness(base).enhance(0.94 + 0.14 * k)
            et = etincelles_autour(3, 0.40, angle0=t * 2 * math.pi, couleur=accent, taille=0.13 - 0.03 * k)
            et = ImageEnhance.Brightness(et).enhance(0.55 + 0.9 * k)
            f = f.copy()
            f.alpha_composite(et)
            simple(f)
        elif anim == 'bounce':
            saut = abs(math.sin(t * 2 * math.pi))
            simple(transformer(base, echelle=1 - 0.07 * (1 - saut), dy=int(-W * 0.11 * saut)))
        elif anim == 'sparkle':
            k = 0.5 + 0.5 * math.sin(t * 4 * math.pi)
            et = etincelles_autour(4, 0.42, angle0=t * 2 * math.pi, couleur=(255, 255, 255), taille=0.10 + 0.05 * k)
            et = ImageEnhance.Brightness(et).enhance(0.5 + 1.0 * k)
            f = transformer(base, echelle=1 + 0.03 * k)
            f.alpha_composite(et)
            simple(f)
        elif anim == 'confetti':
            particules = [(0.15, 0.0), (0.42, 0.35), (0.68, 0.15), (0.85, 0.5), (0.28, 0.6), (0.58, 0.75)]
            couleurs = [(255, 226, 130), (255, 128, 140), (132, 194, 255), (144, 250, 190), (255, 255, 255), (206, 158, 255)]
            f = base.copy()
            d = ImageDraw.Draw(f)
            for j, (px, py) in enumerate(particules):
                yy = (py + t) % 1.0
                xx = px + 0.05 * math.sin((t + j) * 6.28)
                cote = W * 0.055
                d.rectangle([xx * W - cote / 2, yy * W - cote, xx * W + cote / 2, yy * W],
                            fill=couleurs[j % len(couleurs)] + (235,))
            simple(f)
        elif anim == 'orbit':
            f = transformer(base, echelle=1 + 0.03 * math.sin(t * 2 * math.pi)).copy()
            for j in range(3):
                a = t * 2 * math.pi + j * 2 * math.pi / 3
                cx = W * .5 + math.cos(a) * W * 0.44
                cy = W * .5 + math.sin(a) * W * 0.26
                r = W * 0.085
                pt = _calque()
                ImageDraw.Draw(pt).ellipse([cx - r, cy - r, cx + r, cy + r], fill=accent + (235,))
                f.alpha_composite(pt)
            simple(f)
        else:
            simple(base)

    return [imgs_128(im) for im in imgs]


def imgs_128(img):
    return engine.nettoyer(img)


def _palette_gif(frames, couleurs):
    """Convertit des frames RGBA en images palette avec un VRAI fond transparent.

    Méthode : on quantifie les couleurs sur (couleurs-1) teintes, on réserve
    l'index `couleurs-1` au transparent, puis on écrit un GIF avec
    transparency=<index>. Vérifié : coin (0,0) alpha = 0.
    """
    import numpy as np
    out = []
    idx_transparent = couleurs - 1
    for f in frames:
        rgba = f.convert('RGBA')
        arr = np.array(rgba)
        alpha = arr[:, :, 3]
        rgb = Image.fromarray(arr[:, :, :3], 'RGB')
        p = rgb.convert('P', palette=Image.ADAPTIVE,
                        colors=max(2, couleurs - 1), dither=Image.NONE)
        # table de couleurs complétée jusqu'à l'index transparent
        palette = p.getpalette() or []
        palette = palette[: (couleurs - 1) * 3]
        palette += [0, 0, 0] * (couleurs - 1 - len(palette) // 3)
        palette += [0, 0, 0]
        p.putpalette(palette)
        pix = p.load()
        h, w = alpha.shape
        for y in range(h):
            for x in range(w):
                if alpha[y, x] < 110:
                    pix[x, y] = idx_transparent
        out.append(p)
    return out


def _ecrire_gif(chemin, images, duree, idx_transparent):
    images[0].save(chemin, save_all=True, append_images=images[1:], duration=duree,
                   loop=0, optimize=False, disposal=2, transparency=idx_transparent)


def enregistrer(cle, categorie, img, frames, dossier):
    chemin = os.path.join(dossier, cle)
    if frames:
        # GIF optimisé : 16 frames, palette réduite → sous les 256 Ko
        chemin_gif = chemin + '.gif'
        alt = _palette_gif(frames, 96)
        _ecrire_gif(chemin_gif, alt, 70, 95)
        taille = os.path.getsize(chemin_gif)
        if taille > 250000:
            alt = _palette_gif(frames, 48)
            _ecrire_gif(chemin_gif, alt, 85, 47)
            taille = os.path.getsize(chemin_gif)
        return chemin_gif, taille, 'gif'
    chemin_png = chemin + '.png'
    img.save(chemin_png, optimize=True)
    return chemin_png, os.path.getsize(chemin_png), 'png'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tout', action='store_true')
    ap.add_argument('--test', type=int, default=0)
    ap.add_argument('--categorie', default=None)
    args = ap.parse_args()

    os.makedirs(DOSSIER, exist_ok=True)
    entrees = E
    if args.categorie:
        entrees = [e for e in E if e[1] == args.categorie]
    if args.test:
        entrees = E[:args.test]

    inventaire = []
    vus = set()
    for cle, cat, nom_forme, nom_theme, secours, anim, orn in entrees:
        cle_propre = propre(cle)
        if cle_propre in vus:
            print('⚠️  doublon ignoré :', cle_propre)
            continue
        vus.add(cle_propre)
        base = rendre_base(cle, nom_forme, nom_theme, orn, avec_details=(anim != 'tic'))
        frames = rendre_frames(base, anim, engine.THEMES[nom_theme].accent,
                               nom_forme, engine.THEMES[nom_theme]) if anim else None
        img = engine.nettoyer(base)
        chemin, taille, genre = enregistrer(cle_propre, cat, img, frames, DOSSIER)
        inventaire.append({
            'cle': cle_propre, 'categorie': cat, 'forme': nom_forme, 'theme': nom_theme,
            'secours': secours, 'animation': anim, 'gen': genre,
            'octets': taille, 'fichier': os.path.basename(chemin),
        })
        print(f"  {genre:3} {taille/1024:6.1f} Ko  {cle_propre}")

    chemin_json = os.path.join(DOSSIER, 'inventaire.json')
    if args.tout:
        with open(chemin_json, 'w', encoding='utf-8') as f:
            json.dump(inventaire, f, ensure_ascii=False, indent=1)
        print(f"\n{len(inventaire)} emotes → {DOSSIER}")
    trop = [i for i in inventaire if i['octets'] > 255000]
    if trop:
        print('❌ trop lourdes :', [i['cle'] for i in trop])
    return 0


if __name__ == '__main__':
    sys.exit(main())
