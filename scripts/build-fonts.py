#!/usr/bin/env python3
"""Builds the self-hosted woff2 files in public/assets/fonts/ from google/fonts.

Why self-host: Georgia and Verdana are not installed on Chromebooks (ChromeOS ships
Arimo/Tinos/Cousine), and some district filters block fonts.googleapis.com. Fonts
served from allgoodacademy.com itself load everywhere the site loads. Every family
here is SIL OFL 1.1; its OFL.txt is copied beside the woff2 files.

This is a one-off build, not part of `npm run`: the woff2 output is committed, and the
script is kept so the next person can reproduce or extend it rather than guess.

Usage:
    pip install fonttools brotli
    git clone --depth 1 --filter=blob:none --sparse https://github.com/google/fonts.git gf
    (cd gf && git sparse-checkout set ofl/gelasio ofl/atkinsonhyperlegiblenext \
        ofl/inter ofl/atkinsonhyperlegible ofl/bricolagegrotesque)
    python3 -I scripts/build-fonts.py gf/ofl

It also prints the size-adjust / ascent-override values for the metric-matched
fallback faces in public/assets/css/fonts.css:
  - the Chromebook faces, measured against Liberation Serif / Liberation Sans, which
    share Tinos / Arimo's metrics (the ChromeOS fallbacks) and Times New Roman / Arial's;
  - with --ms-fonts DIR, the Mac/Windows/iPad faces, measured against Georgia and
    Verdana (regular, bold, italic, bold italic). Those fonts are not redistributable,
    so they are not in the repo: point DIR at georgia*.ttf / verdana*.ttf from any
    install (AA-6 measured the corefonts georgi32.exe / verdan32.exe files; Verdana and
    Georgia's advance widths and vertical metrics are unchanged in later versions).

    python3 -I scripts/build-fonts.py gf/ofl --ms-fonts ~/msfonts
    python3 -I scripts/build-fonts.py --metrics-only --ms-fonts ~/msfonts
"""
import os
import shutil
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'fonts')

# Latin + Latin Extended (A, B, Additional): Spanish for El Viaje (á é í ó ú ü ñ ¿ ¡),
# plus the punctuation, currency, letterlike and arrow glyphs the pages actually use.
# Keep in step with the unicode-range lines in public/assets/css/fonts.css.
UNICODES = (
    'U+0000-024F,U+0259,U+02B0-02FF,U+0300-036F,U+1E00-1EFF,U+2000-206F,'
    'U+2070-209F,U+20A0-20CF,U+2100-214F,U+2190-2199,U+2212,U+2215,U+2264-2265,'
    'U+FEFF,U+FFFD'
)

# (source dir, source file, output dir, output file, axis limits for the instancer)
# None limits = keep the variable font as is (after subsetting).
BUILDS = [
    # Display. Static instances: the site only uses 400, 700 and 400 italic.
    ('gelasio', 'Gelasio[wght].ttf', 'gelasio', 'Gelasio-Regular.woff2', {'wght': 400}),
    ('gelasio', 'Gelasio[wght].ttf', 'gelasio', 'Gelasio-Bold.woff2', {'wght': 700}),
    ('gelasio', 'Gelasio-Italic[wght].ttf', 'gelasio', 'Gelasio-Italic.woff2', {'wght': 400}),
    # Body. Variable weight, upright + italic.
    ('atkinsonhyperlegiblenext', 'AtkinsonHyperlegibleNext[wght].ttf',
     'atkinson-hyperlegible-next', 'AtkinsonHyperlegibleNext-Variable.woff2', None),
    ('atkinsonhyperlegiblenext', 'AtkinsonHyperlegibleNext-Italic[wght].ttf',
     'atkinson-hyperlegible-next', 'AtkinsonHyperlegibleNext-Italic-Variable.woff2', None),
    # Per-page faces that used to come from fonts.googleapis.com, self-hosted as is.
    # Inter: the three game hubs (Digital Decisions, Real World Ready, Room to Think)
    # asked Google for 400-800; opsz pinned to its default to keep the file small.
    ('inter', 'Inter[opsz,wght].ttf', 'inter', 'Inter-Variable.woff2',
     {'opsz': 14, 'wght': (400, 800)}),
    # AllgoodOS pages: Atkinson Hyperlegible (the original) 400/700 and
    # Bricolage Grotesque 600-800 at full width.
    ('atkinsonhyperlegible', 'AtkinsonHyperlegible-Regular.ttf',
     'atkinson-hyperlegible', 'AtkinsonHyperlegible-Regular.woff2', None),
    ('atkinsonhyperlegible', 'AtkinsonHyperlegible-Bold.ttf',
     'atkinson-hyperlegible', 'AtkinsonHyperlegible-Bold.woff2', None),
    ('bricolagegrotesque', 'BricolageGrotesque[opsz,wdth,wght].ttf',
     'bricolage-grotesque', 'BricolageGrotesque-Variable.woff2',
     {'wdth': 100, 'wght': (600, 800)}),
]


def build(src_root, src_dir, src_file, out_dir, out_file, limits):
    font = TTFont(os.path.join(src_root, src_dir, src_file), lazy=False)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    opts.glyph_names = False
    opts.hinting = False  # browsers on Chromebooks/iPads ignore TrueType hints
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    # Instance after subsetting: instancing Inter's full glyph set first trips a
    # fontTools gvar KeyError, and the result is identical either way.
    if limits:
        font = instancer.instantiateVariableFont(font, limits, updateFontNames=False)
    dest_dir = os.path.join(OUT, out_dir)
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, out_file)
    font.flavor = 'woff2'
    font.save(dest)
    shutil.copyfile(os.path.join(src_root, src_dir, 'OFL.txt'), os.path.join(dest_dir, 'OFL.txt'))
    return dest


# Letter frequencies (English body text), the same approach as capsize / next/font:
# size-adjust = average advance of the web font / average advance of the fallback.
FREQ = {
    'a': 8.2, 'b': 1.5, 'c': 2.8, 'd': 4.3, 'e': 12.7, 'f': 2.2, 'g': 2.0, 'h': 6.1,
    'i': 7.0, 'j': 0.15, 'k': 0.77, 'l': 4.0, 'm': 2.4, 'n': 6.7, 'o': 7.5, 'p': 1.9,
    'q': 0.095, 'r': 6.0, 's': 6.3, 't': 9.1, 'u': 2.8, 'v': 0.98, 'w': 2.4, 'x': 0.15,
    'y': 2.0, 'z': 0.074, ' ': 18.0,
}


def avg_width(font):
    cmap = font.getBestCmap()
    hmtx = font['hmtx']
    upm = font['head'].unitsPerEm
    total = sum(FREQ.values())
    return sum(hmtx[cmap[ord(ch)]][0] * w for ch, w in FREQ.items()) / total / upm


def fallback_metrics(webfont_path, fallback_path, label, wght=None):
    web = TTFont(webfont_path)
    if wght is not None:
        web = instancer.instantiateVariableFont(web, {'wght': wght})
    fb = TTFont(fallback_path)
    adjust = avg_width(web) / avg_width(fb)
    upm = web['head'].unitsPerEm
    hhea = web['hhea']
    asc = hhea.ascent / upm
    desc = -hhea.descent / upm
    gap = hhea.lineGap / upm
    print(f'{label}: size-adjust: {adjust * 100:.2f}%; ascent-override: {asc / adjust * 100:.2f}%; '
          f'descent-override: {desc / adjust * 100:.2f}%; line-gap-override: {gap / adjust * 100:.2f}%;')


def main():
    args = sys.argv[1:]
    ms = None
    if '--ms-fonts' in args:
        i = args.index('--ms-fonts')
        ms = args[i + 1]
        del args[i:i + 2]
    metrics_only = '--metrics-only' in args
    args = [a for a in args if a != '--metrics-only']
    if not metrics_only:
        if len(args) != 1:
            sys.exit(__doc__)
        src_root = args[0]
        total = 0
        for b in BUILDS:
            dest = build(src_root, *b)
            size = os.path.getsize(dest)
            total += size
            print(f'{os.path.relpath(dest, ROOT)}  {size / 1024:.1f} KB')
        print(f'total {total / 1024:.1f} KB')
    gel = lambda f: os.path.join(OUT, 'gelasio', f)
    atk = os.path.join(OUT, 'atkinson-hyperlegible-next', 'AtkinsonHyperlegibleNext-Variable.woff2')
    atk_i = os.path.join(OUT, 'atkinson-hyperlegible-next', 'AtkinsonHyperlegibleNext-Italic-Variable.woff2')
    liberation = '/usr/share/fonts/truetype/liberation'
    fallback_metrics(gel('Gelasio-Regular.woff2'),
                     os.path.join(liberation, 'LiberationSerif-Regular.ttf'),
                     'Gelasio Chromebook Fallback (Tinos / Times New Roman)')
    fallback_metrics(atk, os.path.join(liberation, 'LiberationSans-Regular.ttf'),
                     'Atkinson Chromebook Fallback (Arimo / Arial)')
    fallback_metrics(gel('Gelasio-Bold.woff2'),
                     os.path.join(liberation, 'LiberationSerif-Bold.ttf'),
                     'Gelasio Chromebook Fallback 700 (Tinos Bold / Times New Roman Bold)')
    fallback_metrics(atk, os.path.join(liberation, 'LiberationSans-Bold.ttf'),
                     'Atkinson Chromebook Fallback 700 (Arimo Bold / Arial Bold)', 700)
    if ms:
        m = lambda f: os.path.join(ms, f)
        fallback_metrics(gel('Gelasio-Regular.woff2'), m('georgia.ttf'), 'Gelasio Fallback 400 (Georgia)')
        fallback_metrics(gel('Gelasio-Bold.woff2'), m('georgiab.ttf'), 'Gelasio Fallback 700 (Georgia Bold)')
        fallback_metrics(gel('Gelasio-Italic.woff2'), m('georgiai.ttf'), 'Gelasio Fallback 400 italic (Georgia Italic)')
        fallback_metrics(atk, m('verdana.ttf'), 'Atkinson Fallback 400 (Verdana)', 400)
        fallback_metrics(atk, m('verdanab.ttf'), 'Atkinson Fallback 700 (Verdana Bold)', 700)
        fallback_metrics(atk_i, m('verdanai.ttf'), 'Atkinson Fallback 400 italic (Verdana Italic)', 400)
        fallback_metrics(atk_i, m('verdanaz.ttf'), 'Atkinson Fallback 700 italic (Verdana Bold Italic)', 700)


if __name__ == '__main__':
    main()
