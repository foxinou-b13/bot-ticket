"""tools/emotes/flat2d.py — rendu « 2D style emote Discord ».

Ce que la recherche dit des emotes qui marchent sur Discord :
  - contours épais et sombres (un trait fin disparaît à 32 px)
  - aplats de couleur + une seule marche d'ombre (cel shading), pas de dégradé
  - couleurs saturées, fort contraste (le chat Discord est gris foncé)
  - aucun détail fin, une seule forme forte
  - option « bordure blanche » fine : le look autocollant qui se détache partout

Module utilisé uniquement pour comparer les styles avant de choisir.
"""
import sys
import os

if __package__ in (None, ''):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from tools.emotes import engine
    from tools.emotes import render as R
else:
    from . import engine
    from . import render as R

from PIL import Image, ImageDraw, ImageFilter, ImageChops

W = engine.W


def _melange(a, b, k):
    return tuple(int(a[i] * (1 - k) + b[i] * k) for i in range(3))


def _sature(couleur, k=0.0):
    r, g, b = couleur
    moy = (r + g + b) / 3
    return tuple(max(0, min(255, int(moy + (c - moy) * (1 + k)))) for c in (r, g, b))


def _impaire(n):
    n = max(3, int(n))
    return n + 1 if n % 2 == 0 else n


def rendre_2d(nom_forme, theme, orn=None, style='emote'):
    """Rendu 2D.

    style :
      'emote'        → aplat + une marche d'ombre (cel) + contour épais sombre
      'emote_bordure'→ idem + fine bordure blanche extérieure (look autocollant)
      'emoji_plat'   → aplat pur + contour épais (style emoji système)
    """
    dessin = R.forme(nom_forme)
    masque = engine.masque(dessin, (W, W))
    if masque.getbbox() is None:
        raise ValueError('forme vide : ' + nom_forme)

    # couleurs : franches, saturées, lisibles sur fond sombre
    base = _sature(_melange(theme.haut, theme.bas, 0.32), 0.30)
    if max(base) < 95:                       # thèmes très sombres (obsidienne)
        base = _sature(_melange(theme.haut, theme.bas, 0.18), 0.25)
    ombre = _sature(_melange(base, theme.bas, 0.34), 0.10)
    clair = _sature(_melange(base, theme.haut, 0.55), 0.15)
    contour = theme.contour

    ep = _impaire(W // 46)                   # contour épais (≈ 2,8 px à 128)
    out = Image.new('RGBA', (W, W), (0, 0, 0, 0))

    # 1) bordure blanche éventuelle (sous le contour sombre)
    if style == 'emote_bordure':
        blanc = masque.filter(ImageFilter.MaxFilter(_impaire(ep * 2.6)))
        out.paste(Image.new('RGBA', (W, W), (255, 255, 255, 240)), (0, 0), blanc)

    # 2) contour sombre épais
    large = masque.filter(ImageFilter.MaxFilter(ep))
    out.paste(Image.new('RGBA', (W, W), contour + (255,)), (0, 0), large)

    # 3) remplissage : aplat, ou aplat + marche d'ombre (bas droite) décalée
    if style == 'emoji_plat':
        out.paste(Image.new('RGBA', (W, W), base + (255,)), (0, 0), masque)
    else:
        dedans = masque.filter(ImageFilter.MinFilter(_impaire(ep)))
        out.paste(Image.new('RGBA', (W, W), ombre + (255,)), (0, 0), dedans)
        haut_gauche = Image.new('L', (W, W), 0)
        ImageDraw.Draw(haut_gauche).polygon(
            [(-W, -W), (W, -W), (-W, W)], fill=255)
        corps = ImageChops.multiply(dedans, haut_gauche.filter(
            ImageFilter.GaussianBlur(W * 0.02)))
        out.paste(Image.new('RGBA', (W, W), base + (255,)), (0, 0), corps)
        # petite lumière dure en haut à gauche (une seule marche)
        lueur = ImageChops.multiply(dedans, _bande_haut_gauche())
        out.paste(Image.new('RGBA', (W, W), clair + (255,)), (0, 0),
                  lueur.point(lambda v: int(v * 0.85)))

    # 4) facettes / traits à plat (gemmes, bouclier…) plus sombres
    if nom_forme in R.ARETES and style != 'emoji_plat':
        couche = Image.new('RGBA', (W, W), (0, 0, 0, 0))
        d = ImageDraw.Draw(couche)
        for ligne in R.ARETES[nom_forme]:
            pts = [(x * W, y * W) for x, y in ligne]
            d.line(pts, fill=contour + (170,), width=max(2, W // 130), joint='curve')
        dedans = masque.filter(ImageFilter.MinFilter(_impaire(ep)))
        out = Image.alpha_composite(
            out, Image.composite(couche, Image.new('RGBA', (W, W), (0, 0, 0, 0)), dedans))

    # 5) détails (yeux, aiguilles…)
    out = R.appliquer_details(out, nom_forme, theme)

    # 6) ornement
    deco = R.ornement(orn, theme)
    if deco is not None:
        out = Image.alpha_composite(out, deco)

    return engine.nettoyer(out)


def _bande_haut_gauche():
    """Masque : une bande lumineuse en haut à gauche, bord droit (cel)."""
    m = Image.new('L', (W, W), 0)
    d = ImageDraw.Draw(m)
    d.polygon([(0, 0), (W, 0), (0, W)], fill=255)
    return m.filter(ImageFilter.MinFilter(_impaire(W // 12)))
