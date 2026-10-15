"""Roland Remote Control Guide PDF → パラメータ表 JSON（pdfplumber）。
- セクション：Cond 19pt の行（'Video' 等）、サブセクション：Semibold 10pt の行
- 表の列境界：見出し行（Address / Parameter name / SysEx value / Meaning of value）の x
- レコード：アドレス行 + 直後の継続バイト行（'03H' だけの行）。文章の継続行は各レコードの y 中心の中点帯で割り当て
"""
import json, re, sys
import pdfplumber

ADDR = re.compile(r'^([0-9A-Fx]{2}H) ([0-9A-Fx]{2}H) ([0-9A-Fx]{2}H)$')
BYTE = re.compile(r'^[0-9A-F]{2}H$')
KERN = re.compile(r'\b([0-9A-F]) ([0-9A-F]H)\b')

def norm(s):
    # 英語版の記号に揃える。日本語版（*_jpn*.pdf）は ～ 、 ： （ ） と ※ を使う
    s = s.replace('–', '-').replace('’', "'").replace('‐', '-')
    s = s.replace('～', '-').replace('〜', '-').replace('、', ', ').replace('：', ': ').replace('（', ' (').replace('）', ') ').replace('　', ' ')
    s = s.replace('※', '*')
    return ' '.join(s.split()).strip()

def lines_of(page):
    words = page.extract_words(x_tolerance=1.5, y_tolerance=2, extra_attrs=['fontname', 'size'])
    rows = {}
    for w in words:
        rows.setdefault(round(w['top'] / 2.5), []).append(w)
    out = []
    for key in sorted(rows):
        ws = sorted(rows[key], key=lambda w: w['x0'])
        out.append({'y': sum(w['top'] for w in ws) / len(ws), 'words': ws})
    return out

def text(ws, lo=-1, hi=1e9):
    return norm(' '.join(w['text'] for w in ws if lo <= w['x0'] < hi))

def font_kind(ws):
    ws = [w for w in ws if 'RolandOwnersManual' not in w['fontname']]  # Á / À の飾り文字を除く
    if not ws: return 'glyph'
    names = {w['fontname'].split('+')[-1] for w in ws}
    sizes = {round(w['size']) for w in ws}
    if any('UDShinGo' in n for n in names):  # 日本語版：● セクション / ○ サブセクション / 見出し行は Medium 5.5pt / 本文は Light 5.5pt
        first = ws[0]['text']
        if first.startswith('●'): return 'section'
        if first.startswith('○'): return 'sub'
        if any(w['text'] == 'Address' for w in ws) and all('Medium' in n for n in names): return 'header'
        if sizes <= {5, 6}: return 'body'
        return 'other'
    if any('Cond' in n for n in names) and sizes & {19, 20}: return 'section'
    if all('Semibold' in n for n in names) and sizes == {10}: return 'sub'
    if all('Semibold' in n for n in names) and sizes <= {6, 7} and any(w['text'] == 'Address' for w in ws): return 'header'
    if sizes <= {6, 7}: return 'body'
    return 'other'

def parse(path):
    recs = []
    section = sub = None
    notes = []
    with pdfplumber.open(path) as pdf:
        for pno, page in enumerate(pdf.pages):
            lines = lines_of(page)
            cols = None
            # 1) 列境界（ページ内最初の見出し行）
            kinds = [font_kind(ln['words']) for ln in lines]
            for j, ln in enumerate(lines):
                if kinds[j] == 'header':
                    xs = {}
                    for w in ln['words']:
                        tl = w['text'].lower()
                        if tl == 'address': xs['addr'] = w['x0']
                        elif tl == 'parameter': xs['name'] = w['x0']
                        elif tl.startswith('sys'): xs['sys'] = w['x0']
                        elif tl == 'meaning': xs['mean'] = w['x0']
                    if len(xs) == 4:
                        cols = xs; break
            if cols is None:
                for j, ln in enumerate(lines):
                    if kinds[j] == 'section': section = text(ln['words']).lstrip('\u00c1 ').strip()
                continue
            c_name, c_sys, c_mean = cols['name'] - 3, cols['sys'] - 3, cols['mean'] - 3
            # 2) 読み順に：セクション／サブセクション／注釈／アドレス行／継続バイト行
            page_recs = []
            used = set()
            for j, ln in enumerate(lines):
                k = kinds[j]
                t = text(ln['words'])
                if k == 'section':
                    section = t.lstrip('\u00c1● ').strip(); continue
                if k == 'sub':
                    sub = t.lstrip('\u00c0○ ').strip(); notes = []; continue
                if k != 'body': continue
                if t.startswith('*') or t.startswith('(*'):
                    notes.append(t)
                    for r in page_recs:
                        if r['sub'] == sub: r['notes'] = list(notes)
                    continue
                head = KERN.sub(r'\1\2', text(ln['words'], -1, c_name))  # 日本語版は '0' '0H' に割れることがある
                if ADDR.match(head):
                    r = {'page': pno + 1, 'section': section, 'sub': sub, 'addr': [b[:2] for b in head.split()], 'size': 1,
                         'lines': [j], 'notes': list(notes)}
                    page_recs.append(r); used.add(j)
                elif BYTE.match(head) and page_recs and j - page_recs[-1]['lines'][-1] <= 3:
                    page_recs[-1]['size'] += 1; page_recs[-1]['lines'].append(j); used.add(j)
            if not page_recs: continue
            # 3) 文章の継続行を y 中心の中点帯で割り当て
            centers = [sum(lines[j]['y'] for j in r['lines']) / len(r['lines']) for r in page_recs]
            for j, ln in enumerate(lines):
                if j in used or kinds[j] != 'body': continue
                t_all = text(ln['words'])
                if t_all.startswith('*') or t_all.startswith('(*'): continue
                if not text(ln['words'], c_name): continue  # 列外（ページ番号など）
                y = ln['y']
                best = None
                for k, c in enumerate(centers):
                    lo = (centers[k - 1] + c) / 2 if k > 0 else c - 12
                    hi = (c + centers[k + 1]) / 2 if k + 1 < len(centers) else c + 12
                    if lo < y <= hi: best = k; break
                if best is not None:
                    page_recs[best]['lines'].append(j)
            # 4) 文字列化
            for r in page_recs:
                js = sorted(r['lines'])
                r['name'] = ' '.join(x for x in (text(lines[j]['words'], c_name, c_sys) for j in js) if x)
                r['sysex'] = ' '.join(x for x in (text(lines[j]['words'], c_sys, c_mean) for j in js) if x)
                r['meaning'] = ' '.join(x for x in (text(lines[j]['words'], c_mean) for j in js) if x)
                del r['lines']
                if r['name']: recs.append(r)
    return recs

if __name__ == '__main__':
    rows = parse(sys.argv[1])
    json.dump(rows, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from collections import Counter
    print(len(rows), 'rows', dict(Counter(r['size'] for r in rows)))
    print(Counter(r['section'] for r in rows))
    print(len(Counter(r['sub'] for r in rows)), 'subs; empty sub:', sum(1 for r in rows if not r['sub']))
